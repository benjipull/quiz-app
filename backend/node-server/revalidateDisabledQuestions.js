require("dotenv").config();
const { installScriptErrorPrefix } = require("./scripts/errorLogger");
installScriptErrorPrefix();
const mongoose = require("mongoose");
const Category = require("./models/categoryModel");
const connectDB = require("./config/db");
const { validateAndPersistQuestion } = require("./scripts/validateQuestions");
const { processSingleQuestion } = require("./scripts/validateDuplicateQuestions");
const { populateDifficulty } = require("./scripts/populateDifficulty");

// --- Config ---
const MAX_FIX_ATTEMPTS = Number(process.env.POPULATE_MAX_FIX_ATTEMPTS || 1);
const ENABLE_AUTO_FIX = process.env.POPULATE_ENABLE_AUTO_FIX !== "false"; // default true

/**
 * Get all categories with disabled questions (excluding duplicates)
 */
async function getCategoriesWithDisabledQuestions() {
  return Category.aggregate([
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
                // Exclude questions disabled due to duplication
                {
                  $or: [
                    { $eq: ["$$q.disabled_reason", ""] },
                    { $ne: ["$$q.disabled_reason", "Marked as duplicate"] },
                    {
                      $regexMatch: {
                        input: "$$q.disabled_reason",
                        regex: "validation|Incorrect|Ambiguous|pipeline",
                        options: "i"
                      }
                    }
                  ]
                }
              ]
            }
          }
        }
      }
    },
    {
      $match: {
        $expr: { $gt: [{ $size: "$disabledQuestions" }, 0] }
      }
    },
    {
      $project: {
        name: 1,
        disabledCount: { $size: "$disabledQuestions" },
        questionIds: "$disabledQuestions._id"
      }
    },
    { $sort: { disabledCount: -1 } }
  ]);
}

/**
 * Revalidate a single disabled question through the full pipeline
 */
async function revalidateQuestion(categoryId, questionId, questionText) {
  console.log(`\n🔍 Revalidating: "${questionText}"`);

  try {
    // Step 1: Run validation
    const validationResult = await validateAndPersistQuestion(categoryId, questionId);

    if (!validationResult.success) {
      console.log(`   ❌ Validation failed to run`);
      return { success: false, enabled: false, fixed: false };
    }

    if (!validationResult.disabled) {
      console.log(`   ✅ Question is now ENABLED after revalidation!`);
      console.log(`   📋 Verdict: ${validationResult.verdict || "Unknown"}`);

      // Continue to duplicate check and difficulty
      const duplicateResult = await processSingleQuestion(categoryId, questionId);
      if (duplicateResult?.duplicateFound) {
        console.log(`   ❌ Disabled by duplicate check`);
        return { success: true, enabled: false, fixed: false };
      }

      await populateDifficulty(String(categoryId), String(questionId));
      return { success: true, enabled: true, fixed: false };
    }

    // Still disabled - try to fix if enabled
    console.log(`   ⚠️ Still disabled - Verdict: ${validationResult.verdict || "Unknown"}`);

    if (validationResult.correctAnswerReasoning) {
      console.log(`   💡 Reasoning: ${validationResult.correctAnswerReasoning}`);
    }

    if (validationResult.otherAnswersPossible?.length > 0) {
      console.log(`   ⚠️  Other possible answers: ${validationResult.otherAnswersPossible.join(", ")}`);
    }

    if (!ENABLE_AUTO_FIX) {
      console.log(`   ⏭️  Auto-fix disabled, skipping fix attempts`);
      return { success: true, enabled: false, fixed: false };
    }

    // Try to fix the question
    let fixAttemptCount = 0;
    let currentValidationResult = validationResult;

    while (fixAttemptCount < MAX_FIX_ATTEMPTS && currentValidationResult.disabled) {
      fixAttemptCount++;
      console.log(`   🔧 Fix attempt ${fixAttemptCount}/${MAX_FIX_ATTEMPTS}...`);

      // Get current question data
      const category = await Category.findOne(
        { _id: categoryId, "questions._id": questionId },
        { "questions.$": 1 }
      );
      const currentQuestion = category?.questions?.[0];

      if (!currentQuestion?.validation) {
        console.log(`   ❌ Could not retrieve question or validation data`);
        break;
      }

      // Build validation object for fix prompt
      const validation = {
        final_verdict: currentValidationResult.verdict,
        ambiguity_type: currentValidationResult.ambiguityType,
        ambiguity_reasoning: currentValidationResult.ambiguityReasoning,
        other_answers_possible: currentValidationResult.otherAnswersPossible || [],
        correct_answer_reasoning: currentValidationResult.correctAnswerReasoning,
        explanation_consistent: currentValidationResult.explanationConsistent,
      };

      // Attempt fix (using the function from populateCategories)
      const { tryFixValidationFailure } = require("./scripts/populateCategories");
      const fixedQuestion = await tryFixValidationFailure(currentQuestion, validation, categoryId);

      if (!fixedQuestion) {
        console.log(`   ❌ Fix attempt ${fixAttemptCount} failed`);
        break;
      }

      // Re-validate fixed question
      console.log(`   🔍 Re-validating fixed question...`);
      const revalidationResult = await validateAndPersistQuestion(categoryId, questionId, fixedQuestion);

      if (revalidationResult.success && !revalidationResult.disabled) {
        console.log(`   ✅✅ SUCCESS! Question is now ENABLED after fix attempt ${fixAttemptCount}`);

        // Continue to duplicate check and difficulty
        const duplicateResult = await processSingleQuestion(categoryId, questionId);
        if (duplicateResult?.duplicateFound) {
          console.log(`   ❌ Disabled by duplicate check`);
          return { success: true, enabled: false, fixed: true };
        }

        await populateDifficulty(String(categoryId), String(questionId));
        return { success: true, enabled: true, fixed: true };
      } else {
        console.log(`   ⚠️  Question still disabled after fix attempt ${fixAttemptCount}`);
        console.log(`   New verdict: ${revalidationResult.verdict || "Unknown"}`);
        currentValidationResult = revalidationResult;
      }
    }

    return { success: true, enabled: false, fixed: false };

  } catch (error) {
    console.error(`   ❌ Error during revalidation:`, error.message);
    return { success: false, enabled: false, fixed: false };
  }
}

/**
 * Main revalidation process
 */
async function revalidateAllDisabledQuestions() {
  try {
    await connectDB();
    console.log("🚀 Connected to MongoDB");
    console.log("🔹 Starting disabled questions revalidation...");
    console.log(`🔧 Auto-fix: ${ENABLE_AUTO_FIX ? `ENABLED (max ${MAX_FIX_ATTEMPTS} attempt${MAX_FIX_ATTEMPTS > 1 ? "s" : ""})` : "DISABLED"}`);

    const categories = await getCategoriesWithDisabledQuestions();

    if (categories.length === 0) {
      console.log("✅ No categories with disabled validation questions found.");
      return;
    }

    console.log(`\n📊 Found ${categories.length} categories with disabled questions`);

    let totalProcessed = 0;
    let totalEnabled = 0;
    let totalFixed = 0;
    let totalFailed = 0;

    for (const category of categories) {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`📘 Category: "${category.name}" (${category.disabledCount} disabled questions)`);
      console.log("=".repeat(80));

      // Get full category data with question details
      const fullCategory = await Category.findById(category._id);
      const disabledQuestions = fullCategory.questions.filter(q =>
        q.disabled &&
        category.questionIds.some(id => id.equals(q._id))
      );

      for (const question of disabledQuestions) {
        totalProcessed++;

        const result = await revalidateQuestion(
          category._id,
          question._id,
          question.text
        );

        if (result.enabled) {
          totalEnabled++;
          if (result.fixed) totalFixed++;
        }

        if (!result.success) {
          totalFailed++;
        }
      }

      console.log(`\n📊 Category "${category.name}" complete`);
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log("🎉 Revalidation Complete!");
    console.log("=".repeat(80));
    console.log(`📊 Total questions processed: ${totalProcessed}`);
    console.log(`✅ Questions enabled: ${totalEnabled}`);
    console.log(`🔧 Questions fixed and enabled: ${totalFixed}`);
    console.log(`⚠️  Questions still disabled: ${totalProcessed - totalEnabled}`);
    console.log(`❌ Errors: ${totalFailed}`);

  } catch (err) {
    console.error("❌ Error revalidating questions:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed.");
  }
}

// Run the script
revalidateAllDisabledQuestions();
