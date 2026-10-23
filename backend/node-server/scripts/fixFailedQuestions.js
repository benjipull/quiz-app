require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");
const { installScriptErrorPrefix } = require("./errorLogger");
installScriptErrorPrefix();
const {
  assertOllamaSetup,
  callOllamaForText,
} = require("../services/ollamaClient");
const { parseJsonObject } = require("./jsonParsingHelper");
const {
  buildFixAmbiguousQuestionPrompt,
  buildFixIncorrectQuestionPrompt,
  buildFixInconsistentExplanationPrompt,
} = require("./prompts/fixQuestionPrompts");
const { validateAndPersistQuestion } = require("./validateQuestions");

// Configuration
const TARGET_VERSION = parseFloat(process.argv[2]) || 3.51;
const DRY_RUN = process.argv.includes("--dry-run");
const MAX_QUESTIONS_TO_FIX = parseInt(process.argv.find(arg => arg.startsWith("--limit="))?.split("=")[1]) || 50;

try {
  assertOllamaSetup();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

async function callOllama(prompt) {
  return callOllamaForText({
    prompt: `${prompt}\n\nSTRICT FORMAT: Respond with exactly one JSON object only. Do not output <think> tags, markdown, or any prose before/after JSON.`,
    presetName: "fixQuestions",
  });
}

async function fixAmbiguousQuestion(question, validation, categoryId) {
  console.log(`\n🔧 Attempting to fix AMBIGUOUS question: "${question.text}"`);
  console.log(`   Type: ${validation.ambiguity_type}`);
  console.log(`   Reason: ${validation.ambiguity_reasoning?.slice(0, 100)}...`);

  const prompt = buildFixAmbiguousQuestionPrompt(question, validation);
  const rawResponse = await callOllama(prompt);
  const fixResult = parseJsonObject(rawResponse, {
    normalizeOptions: {
      stripThinkTags: true,
      stripIntroPrefix: true,
    },
  });

  if (!fixResult || !fixResult.fix_applied) {
    console.log(`   ❌ Could not fix: ${fixResult?.fix_reasoning || "Unknown reason"}`);
    return null;
  }

  console.log(`   ✅ Fixed question: "${fixResult.fixed_question}"`);
  console.log(`   Reasoning: ${fixResult.fix_reasoning}`);

  return {
    text: fixResult.fixed_question,
    explanation: fixResult.fixed_explanation,
    answers: question.answers,
    correct_answer: question.correct_answer,
  };
}

async function fixIncorrectQuestion(question, validation, categoryId) {
  console.log(`\n🔧 Attempting to fix INCORRECT question: "${question.text}"`);
  console.log(`   Reason: ${validation.correct_answer_reasoning?.slice(0, 100)}...`);

  const prompt = buildFixIncorrectQuestionPrompt(question, validation);
  const rawResponse = await callOllama(prompt);
  const fixResult = parseJsonObject(rawResponse, {
    normalizeOptions: {
      stripThinkTags: true,
      stripIntroPrefix: true,
    },
  });

  if (!fixResult || fixResult.fix_strategy === "unfixable") {
    console.log(`   ❌ Could not fix: ${fixResult?.fix_reasoning || "Unknown reason"}`);
    return null;
  }

  console.log(`   ✅ Strategy: ${fixResult.fix_strategy}`);
  console.log(`   Fixed question: "${fixResult.fixed_question}"`);
  console.log(`   New correct answer: ${fixResult.fixed_correct_answer}`);

  return {
    text: fixResult.fixed_question,
    explanation: fixResult.fixed_explanation,
    answers: fixResult.fixed_answers || question.answers,
    correct_answer: fixResult.fixed_correct_answer,
  };
}

async function fixInconsistentExplanation(question, validation, categoryId) {
  console.log(`\n🔧 Attempting to fix EXPLANATION for: "${question.text}"`);
  console.log(`   Reason: ${validation.explanation_reasoning?.slice(0, 100)}...`);

  const prompt = buildFixInconsistentExplanationPrompt(question, validation);
  const rawResponse = await callOllama(prompt);
  const fixResult = parseJsonObject(rawResponse, {
    normalizeOptions: {
      stripThinkTags: true,
      stripIntroPrefix: true,
    },
  });

  if (!fixResult || !fixResult.fixed_explanation) {
    console.log(`   ❌ Could not fix explanation`);
    return null;
  }

  console.log(`   ✅ Fixed explanation: "${fixResult.fixed_explanation}"`);

  return {
    text: question.text,
    explanation: fixResult.fixed_explanation,
    answers: question.answers,
    correct_answer: question.correct_answer,
  };
}

async function tryFixQuestion(question, categoryId) {
  const validation = question.validation;

  if (!validation || !question.disabled) {
    return null;
  }

  let fixedQuestion = null;

  // Try to fix based on validation verdict
  if (validation.final_verdict === "Ambiguous") {
    fixedQuestion = await fixAmbiguousQuestion(question, validation, categoryId);
  } else if (validation.final_verdict === "Incorrect") {
    fixedQuestion = await fixIncorrectQuestion(question, validation, categoryId);
  } else if (validation.explanation_consistent === false) {
    fixedQuestion = await fixInconsistentExplanation(question, validation, categoryId);
  }

  if (!fixedQuestion) {
    return null;
  }

  // Re-validate the fixed question
  console.log(`   🔍 Re-validating fixed question...`);

  const questionToValidate = {
    ...question,
    ...fixedQuestion,
  };

  if (DRY_RUN) {
    console.log(`   🏃 DRY RUN: Would validate and update question`);
    return { success: true, dryRun: true };
  }

  // Validate the fixed question
  const validationResult = await validateAndPersistQuestion(categoryId, question._id, questionToValidate);

  if (validationResult.success && !validationResult.disabled) {
    console.log(`   ✅✅ SUCCESS! Question is now ENABLED`);
    return { success: true, enabled: true };
  } else if (validationResult.success && validationResult.disabled) {
    console.log(`   ⚠️  Question still disabled after fix`);
    console.log(`   New verdict: ${validationResult.verdict}`);
    console.log(`   Reason: ${validationResult.correctAnswerReasoning?.slice(0, 100)}...`);
    return { success: false, stillDisabled: true, verdict: validationResult.verdict };
  } else {
    console.log(`   ❌ Validation failed`);
    return { success: false };
  }
}

async function fixFailedQuestions() {
  try {
    await connectDB();
    console.log("🔗 Connected to MongoDB\n");
    console.log(`🎯 Targeting version ${TARGET_VERSION} questions`);
    console.log(`🔢 Max questions to process: ${MAX_QUESTIONS_TO_FIX}`);
    console.log(`🏃 Dry run: ${DRY_RUN ? "YES (no changes will be saved)" : "NO"}\n`);

    // Get all disabled questions for target version
    const categories = await Category.aggregate([
      {
        $project: {
          name: 1,
          disabledQuestions: {
            $filter: {
              input: "$questions",
              as: "q",
              cond: {
                $and: [
                  { $eq: ["$$q.disabled", true] },
                  { $eq: ["$$q.version", TARGET_VERSION] },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          "disabledQuestions.0": { $exists: true },
        },
      },
    ]);

    let totalProcessed = 0;
    let totalFixed = 0;
    let totalStillDisabled = 0;
    let totalUnfixable = 0;

    console.log(`📊 Found ${categories.length} categories with disabled v${TARGET_VERSION} questions\n`);
    console.log("=".repeat(80));

    for (const category of categories) {
      console.log(`\n📁 Category: ${category.name}`);
      console.log(`   Disabled questions: ${category.disabledQuestions.length}`);

      for (const question of category.disabledQuestions) {
        if (totalProcessed >= MAX_QUESTIONS_TO_FIX) {
          console.log(`\n⚠️  Reached limit of ${MAX_QUESTIONS_TO_FIX} questions`);
          break;
        }

        totalProcessed++;

        const result = await tryFixQuestion(question, category._id);

        if (result?.enabled) {
          totalFixed++;
        } else if (result?.stillDisabled) {
          totalStillDisabled++;
        } else {
          totalUnfixable++;
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (totalProcessed >= MAX_QUESTIONS_TO_FIX) {
        break;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📈 FIX RESULTS SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`✅ Successfully fixed & enabled: ${totalFixed} (${((totalFixed / totalProcessed) * 100).toFixed(1)}%)`);
    console.log(`⚠️  Fixed but still disabled: ${totalStillDisabled} (${((totalStillDisabled / totalProcessed) * 100).toFixed(1)}%)`);
    console.log(`❌ Unfixable: ${totalUnfixable} (${((totalUnfixable / totalProcessed) * 100).toFixed(1)}%)`);

    if (DRY_RUN) {
      console.log(`\n🏃 DRY RUN MODE: No changes were saved to the database`);
    }

    await mongoose.connection.close();
    console.log("\n🔒 MongoDB connection closed.");

  } catch (error) {
    console.error("❌ Error fixing questions:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixFailedQuestions();
}

module.exports = { fixFailedQuestions, tryFixQuestion };
