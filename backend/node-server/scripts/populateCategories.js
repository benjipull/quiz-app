require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const { installScriptErrorPrefix } = require("./errorLogger");
installScriptErrorPrefix();
const Category = require("../models/categoryModel");
const {
  OLLAMA_URL,
  assertOllamaSetup,
  callOllama,
  getOllamaResponseText,
} = require("../services/ollamaClient");

const { buildQuestionPrompt } = require("./prompts/questionPrompt");
const { getRandomPromptBuilder } = require("./prompts/questionGeneration");
const { buildFactGenerationPrompt, buildQuestionFromFactPrompt } = require("./prompts/questionGeneration/twoStage");
const { validateAndPersistQuestion } = require("./validateQuestions");
const { populateDifficulty } = require("./populateDifficulty");
const { normalizeJsonText, parseJsonObject } = require("./jsonParsingHelper");
const { processSingleQuestion } = require("./validateDuplicateQuestions");
const {
  buildFixAmbiguousQuestionPrompt,
  buildFixIncorrectQuestionPrompt,
  buildFixInconsistentExplanationPrompt,
} = require("./prompts/fixQuestionPrompts");
const { callOllamaForText } = require("../services/ollamaClient");


// ==== GLOBAL CONFIG ====
const avoidedQuestions = [];
const avoidedQuestionSet = new Set();
const existingQuestions = [];
const MAX_AVOIDED_QUESTIONS = Number(process.env.POPULATE_MAX_AVOIDED_QUESTIONS || 120);
const MAX_SAME_DUPLICATE_STREAK = Number(process.env.POPULATE_MAX_SAME_DUPLICATE_STREAK || 3);
const DEFAULT_MAX_ENABLED_QUESTIONS_PER_CATEGORY = Number(
  process.env.POPULATE_MAX_ENABLED_QUESTIONS_PER_CATEGORY || 100
);
const MAX_GENERATION_ATTEMPTS = Number(process.env.POPULATE_MAX_GENERATION_ATTEMPTS || 2);
const MAX_FIX_ATTEMPTS = Number(process.env.POPULATE_MAX_FIX_ATTEMPTS || 1);
const ENABLE_AUTO_FIX = process.env.POPULATE_ENABLE_AUTO_FIX !== "false"; // default true
const USE_TWO_STAGE_GENERATION = process.env.POPULATE_USE_TWO_STAGE === "true"; // default false
const version = 3.7;

try {
  assertOllamaSetup();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

console.log(`🚀 Ollama API set to: ${OLLAMA_URL}`);
console.log(`🔧 Auto-fix: ${ENABLE_AUTO_FIX ? `ENABLED (max ${MAX_FIX_ATTEMPTS} attempt${MAX_FIX_ATTEMPTS > 1 ? "s" : ""})` : "DISABLED"}`);
console.log(`🎯 Generation mode: ${USE_TWO_STAGE_GENERATION ? "TWO-STAGE (better for small LLMs)" : "SINGLE-STAGE"}`);

// ==== HELPER FUNCTIONS ====

function generateQuestionHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function buildExistingQuestionsSection() {
  if (existingQuestions.length === 0) return "";
  return `EXISTING QUESTIONS FOR THIS CATEGORY (do NOT create similar questions):

${existingQuestions.join("\n\n")}

`;
}

function buildAvoidSection() {
  const existingSection = buildExistingQuestionsSection();
  const avoidedSection = avoidedQuestions.length === 0
    ? ""
    : `RECENTLY ATTEMPTED (do NOT retry these):
${avoidedQuestions.map(q => `- ${q}`).join("\n")}

`;

  if (!existingSection && !avoidedSection) return "";
  return existingSection + avoidedSection;
}

function addToExistingQuestions(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return;
  existingQuestions.push(trimmed);
}

function loadExistingQuestions(category) {
  existingQuestions.length = 0; // Clear array
  const enabledQuestions = (category.questions || [])
    .filter(q => !q.disabled)
    .map(q => q.text)
    .filter(Boolean);

  existingQuestions.push(...enabledQuestions);
  console.log(`📚 Loaded ${existingQuestions.length} existing questions for category "${category.name}"`);
}

function rememberAvoidedQuestion(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed || avoidedQuestionSet.has(trimmed)) return;

  avoidedQuestions.push(trimmed);
  avoidedQuestionSet.add(trimmed);

  while (avoidedQuestions.length > MAX_AVOIDED_QUESTIONS) {
    const removed = avoidedQuestions.shift();
    if (removed) {
      avoidedQuestionSet.delete(removed);
    }
  }
}

function normalizeQuestion(raw) {
  const difficulty = Number(raw.difficulty ?? raw.difficulty_level ?? 5);
  return {
    question: raw.question ?? "",
    answers: Array.isArray(raw.answers) ? raw.answers.slice(0, 4) : [],
    correct_answer: raw.correct_answer ?? "",
    explanation: raw.explanation ?? "",
    source_domain: raw.source_domain ?? "",
    source_title: raw.source_title ?? "",
    source_quote: raw.source_quote ?? "",
    difficulty_level: Number.isFinite(difficulty)
      ? Math.max(1, Math.min(10, Math.round(difficulty)))
      : 5,
    difficulty_rationale: raw.difficulty_rationale ?? ""
  };
}

function compactText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function sanitizeGeneratedQuestionText(text) {
  const normalized = String(text ?? "");
  return normalized
    .replace(/\s*[—-]\s*(where is it|what is it)\??/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function explanationLooksLikeModelReasoning(explanation) {
  return /\b(let'?s|i need|i should|my approach|existing questions|prompt asks|do not duplicate|before generating|try another angle)\b/i
    .test(String(explanation ?? ""));
}

function sanitizeGeneratedExplanation(explanation, correctAnswer) {
  const compacted = compactText(explanation);
  const fallback = `${compactText(correctAnswer) || "This answer"} is the correct answer.`;

  if (!compacted || explanationLooksLikeModelReasoning(compacted)) {
    return fallback;
  }

  if (compacted.length <= 240) {
    return compacted;
  }

  const firstSentence = compacted.match(/^.{1,220}?[.!?](?:\s|$)/)?.[0]?.trim();
  if (firstSentence && !explanationLooksLikeModelReasoning(firstSentence)) {
    return firstSentence;
  }

  return `${compacted.slice(0, 220).trim()}...`;
}

function sanitizeGeneratedQuestion(question) {
  if (!question || typeof question !== "object") {
    return question;
  }

  return {
    ...question,
    question: sanitizeGeneratedQuestionText(question.question),
    answers: Array.isArray(question.answers)
      ? question.answers.map((answer) => compactText(answer)).filter(Boolean)
      : [],
    correct_answer: compactText(question.correct_answer),
    explanation: sanitizeGeneratedExplanation(question.explanation, question.correct_answer),
  };
}

function validateQuestionShape(question) {
  if (!question || typeof question !== "object") {
    return { isValid: false, reason: "empty question payload" };
  }

  const correctAnswer = String(question.correct_answer ?? "").trim();
  if (!correctAnswer) {
    return { isValid: false, reason: "missing correct_answer" };
  }

  if (!Array.isArray(question.answers) || question.answers.length !== 4) {
    return { isValid: false, reason: "answers must contain exactly 4 items" };
  }

  const normalizedAnswers = question.answers
    .map((answer) => String(answer ?? "").trim().toLowerCase())
    .filter(Boolean);

  if (normalizedAnswers.length !== 4) {
    return { isValid: false, reason: "answers must contain exactly 4 non-empty items" };
  }

  if (new Set(normalizedAnswers).size !== 4) {
    return { isValid: false, reason: "answers must be distinct" };
  }

  const hasMatchingCorrectAnswer = normalizedAnswers.includes(correctAnswer.toLowerCase());
  if (!hasMatchingCorrectAnswer) {
    return { isValid: false, reason: "correct_answer not found in answers" };
  }

  return { isValid: true };
}

function extractBalancedJsonArray(source, startIndex) {
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function parseJsonStringProperty(source, key) {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`, "i");
  const match = keyPattern.exec(source);
  if (!match) return "";

  const valueStart = match.index + match[0].length;
  let isEscaped = false;

  for (let index = valueStart; index < source.length; index += 1) {
    const char = source[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (char === "\"") {
      const rawLiteral = `"${source.slice(valueStart, index)}"`;
      try {
        return JSON.parse(rawLiteral);
      } catch {
        return source.slice(valueStart, index);
      }
    }
  }

  return source.slice(valueStart).trim();
}

function parseJsonArrayProperty(source, key) {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*\\[`, "i");
  const match = keyPattern.exec(source);
  if (!match) return [];

  const arrayStart = match.index + match[0].lastIndexOf("[");
  const rawArray = extractBalancedJsonArray(source, arrayStart);
  if (!rawArray) return [];

  try {
    const parsed = JSON.parse(rawArray);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parsePartialGeneratedQuestionPayload(raw) {
  const cleaned = normalizeJsonText(raw, {
    stripMarkdown: true,
    stripThinkTags: true,
    normalizeQuotes: true,
  });
  if (!cleaned) return null;

  const candidate = {
    question: parseJsonStringProperty(cleaned, "question"),
    answers: parseJsonArrayProperty(cleaned, "answers"),
    correct_answer: parseJsonStringProperty(cleaned, "correct_answer"),
    explanation: parseJsonStringProperty(cleaned, "explanation"),
  };
  const question = sanitizeGeneratedQuestion(normalizeQuestion(candidate));
  const validation = validateQuestionShape(question);

  return validation.isValid ? question : null;
}

function parseOllamaResponse(rawResponse) {
  const rawText = String(rawResponse ?? "");
  const cleaned = normalizeJsonText(rawText, {
    stripMarkdown: true,
    normalizeQuotes: true,
  });

  try {
    return JSON.parse(rawText);
  } catch (rawParseError) {
    const parsed = parseJsonObject(rawText, {
      normalizeOptions: {
        stripMarkdown: true,
        stripThinkTags: true,
        normalizeQuotes: true,
      },
    });
    if (parsed) {
      return parsed;
    }

    const partialQuestion = parsePartialGeneratedQuestionPayload(rawText);
    if (partialQuestion) {
      console.warn("WARN Recovered partial Ollama JSON with complete question fields.");
      return partialQuestion;
    }

    let cleanedParseError;
    try {
      JSON.parse(cleaned);
    } catch (error) {
      cleanedParseError = error;
    }

    const parseError = new Error(
      `Failed to parse Ollama JSON. Raw parse error: ${rawParseError.message}. Cleaned parse error: ${cleanedParseError?.message || "Unable to extract JSON object from response."}`
    );
    parseError.rawResponse = rawResponse;
    parseError.cleanedResponse = cleaned;
    throw parseError;
  }
}

// ==== OLLAMA COMMUNICATION ====

async function queryOllamaRaw(prompt, options = {}) {
  try {
    const response = await callOllama({
      prompt,
      presetName: "populateCategories",
    });

    const responseText = getOllamaResponseText(response);
    if (!responseText) {
      // Log the actual response structure for debugging
      console.error("🔍 Full response object:", JSON.stringify(response.data, null, 2));
      throw new Error("❌ Ollama response missing parsable text payload.");
    }

    if (options.logResponse) {
      console.log(`   📨 Raw Ollama response:\n${responseText}`);
    }

    return parseOllamaResponse(responseText);

  } catch (error) {
    logOllamaErrorVerbose(error);
    return null;
  }
}

async function queryOllama(prompt, options = {}) {
  const maxAttempts = Math.max(1, Math.trunc(Number(options.maxAttempts || MAX_GENERATION_ATTEMPTS)));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptPrompt = attempt === 1
      ? prompt
      : `${prompt}

Your previous response was invalid, truncated, or not usable.
Return exactly one complete compact JSON object only.
Keep "explanation" under 180 characters.
Do not include reasoning about the prompt, existing questions, duplicates, or your generation process.`;

    const parsed = await queryOllamaRaw(attemptPrompt, options);
    if (!parsed) {
      if (attempt < maxAttempts) {
        console.log(`   WARN Retrying Ollama question generation (${attempt + 1}/${maxAttempts}) after invalid JSON.`);
      }
      continue;
    }

    const question = sanitizeGeneratedQuestion(normalizeQuestion(parsed));
    const validation = validateQuestionShape(question);
    if (validation.isValid) {
      return question;
    }

    console.log(`   WARN Discarded Ollama question response: ${validation.reason}`);
    if (attempt < maxAttempts) {
      console.log(`   WARN Retrying Ollama question generation (${attempt + 1}/${maxAttempts}) after invalid shape.`);
    }
  }

  return null;
}

function formatPayloadForLog(payload) {
  if (payload === undefined || payload === null) return "(empty)";
  return typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

function logOllamaError(error) {
  console.error("⚠️ Error fetching question from Ollama:");
  if (error.response) {
    console.error(`❌ HTTP ${error.response.status}:`, error.response.data);
  } else if (error.request) {
    console.error("❌ No response from Ollama.");
  } else {
    console.error("❌ Request error:", error.message);
  }
}

function logOllamaErrorVerbose(error) {
  logOllamaError(error);

  if (error.rawResponse !== undefined) {
    console.error("Raw Ollama JSON/text payload that failed to parse:");
    console.error(formatPayloadForLog(error.rawResponse));
  }

  if (error.cleanedResponse !== undefined) {
    console.error("Cleaned payload attempted for parse:");
    console.error(formatPayloadForLog(error.cleanedResponse));
  }

  if (error.response && error.response.data !== undefined) {
    console.error("HTTP response payload:");
    console.error(formatPayloadForLog(error.response.data));
  }
}

// ==== MAIN FUNCTIONALITY ====

async function fetchQuestionsTwoStage(categoryName) {
  const avoidSection = buildAvoidSection();

  console.log(`🔹 Generating for category: "${categoryName}" from Ollama (Two-Stage Mode)`);

  // Stage 1: Generate a fact
  console.log(`   📝 Stage 1: Generating fact...`);
  const factPrompt = buildFactGenerationPrompt(categoryName, avoidSection);
  const factResponse = await queryOllamaRaw(factPrompt);
  if (!factResponse) {
    console.log(`   ⚠️ Failed to generate fact`);
    return [];
  }

  const { fact, fact_type } = factResponse;
  if (!fact || !fact_type) {
    console.log(`   ⚠️ Invalid fact response: ${JSON.stringify(factResponse)}`);
    return [];
  }

  console.log(`   ✅ Fact generated (${fact_type}): "${fact}"`);

  // Stage 2: Build question from fact
  console.log(`   🎯 Stage 2: Building question from fact...`);
  const questionPrompt = buildQuestionFromFactPrompt(fact, fact_type, categoryName);
  const question = await queryOllama(questionPrompt);
  if (!question) {
    console.log(`   ⚠️ Failed to generate question from fact`);
    return [];
  }

  console.log(`   ✅ Question generated`);

  const parsedQuestion = sanitizeGeneratedQuestion(question);
  return [parsedQuestion];
}

async function fetchQuestions(categoryName) {
  if (USE_TWO_STAGE_GENERATION) {
    return fetchQuestionsTwoStage(categoryName);
  }

  const avoidSection = buildAvoidSection();
  const randomPromptBuilder = getRandomPromptBuilder();

  // Determine prompt type name for logging
  const promptTypeName = randomPromptBuilder.name === 'buildStandardQuestionPrompt'
    ? 'Standard Question'
    : randomPromptBuilder.name === 'buildCompletePhrasePrompt'
    ? 'Complete Phrase'
    : 'Unknown';

  console.log(`🔹 Generating for category: "${categoryName}" from Ollama (Type: ${promptTypeName})`);

  const prompt = randomPromptBuilder(categoryName, avoidSection);

  const question = await queryOllama(prompt);
  if (!question) return [];

  const parsedQuestion = sanitizeGeneratedQuestion(question);
  return [parsedQuestion];
}

async function callOllamaForFix(prompt) {
  return callOllamaForText({
    prompt: `${prompt}\n\nSTRICT FORMAT: Respond with exactly one JSON object only. Do not output <think> tags, markdown, or any prose before/after JSON.`,
    presetName: "fixQuestions",
  });
}

async function tryFixValidationFailure(question, validation, categoryId) {
  if (!ENABLE_AUTO_FIX) {
    return null;
  }

  console.log(`   🔧 Attempting to auto-fix validation failure...`);

  let prompt = null;
  let fixResult = null;

  try {
    // Determine which fix to apply based on validation verdict
    if (validation.final_verdict === "Ambiguous") {
      prompt = buildFixAmbiguousQuestionPrompt(question, validation);
    } else if (validation.final_verdict === "Incorrect") {
      prompt = buildFixIncorrectQuestionPrompt(question, validation);
    } else if (validation.explanation_consistent === false) {
      prompt = buildFixInconsistentExplanationPrompt(question, validation);
    } else {
      console.log(`   ⚠️  No fix strategy for verdict: ${validation.final_verdict}`);
      return null;
    }

    const rawResponse = await callOllamaForFix(prompt);
    fixResult = parseJsonObject(rawResponse, {
      normalizeOptions: {
        stripThinkTags: true,
        stripIntroPrefix: true,
      },
    });

    if (!fixResult) {
      console.log(`   ❌ Fix failed: Could not parse fix response`);
      return null;
    }

    // Check if fix was applied
    if (validation.final_verdict === "Ambiguous" && !fixResult.fix_applied) {
      console.log(`   ❌ Fix not applied: ${fixResult.fix_reasoning || "Unknown reason"}`);
      return null;
    }

    if (validation.final_verdict === "Incorrect" && fixResult.fix_strategy === "unfixable") {
      console.log(`   ❌ Fix unfixable: ${fixResult.fix_reasoning || "Unknown reason"}`);
      return null;
    }

    // Build fixed question object
    let fixedQuestion = null;
    if (validation.final_verdict === "Ambiguous") {
      fixedQuestion = {
        ...question,
        text: fixResult.fixed_question,
        explanation: fixResult.fixed_explanation,
      };
      console.log(`   ✅ Fixed question: "${fixResult.fixed_question}"`);
    } else if (validation.final_verdict === "Incorrect") {
      fixedQuestion = {
        ...question,
        text: fixResult.fixed_question,
        explanation: fixResult.fixed_explanation,
        correct_answer: fixResult.fixed_correct_answer,
        answers: fixResult.fixed_answers || question.answers,
      };
      console.log(`   ✅ Fixed (strategy: ${fixResult.fix_strategy}): "${fixResult.fixed_question}"`);
    } else {
      fixedQuestion = {
        ...question,
        explanation: fixResult.fixed_explanation,
      };
      console.log(`   ✅ Fixed explanation`);
    }

    return fixedQuestion;
  } catch (error) {
    console.error(`   ❌ Error during fix attempt:`, error.message);
    return null;
  }
}

async function runPostGenerationScripts(categoryId, questionIds) {
  let enabledQuestionCount = 0;
  let disabledQuestionCount = 0;
  let fixedQuestionCount = 0;

  const disableQuestionOnPostGenerationFailure = async (questionId, reason) => {
    await Category.updateOne(
      { _id: categoryId, "questions._id": questionId },
      {
        $set: {
          "questions.$.disabled": true,
          "questions.$.disabled_reason": reason,
        },
      }
    );
  };

  for (const questionId of questionIds) {
    try {
      const validationResult = await validateAndPersistQuestion(categoryId, questionId);
      if (!validationResult.success) {
        await disableQuestionOnPostGenerationFailure(
          questionId,
          "Disabled automatically because validation failed during populate flow."
        );
        disabledQuestionCount += 1;
        console.log(`❌ Validation FAILED for question ${questionId}. Skipping difficulty population.`);
        continue;
      }

      if (validationResult.disabled) {
        disabledQuestionCount += 1;
        console.log(`\n❌ Question ${questionId} was DISABLED by validation:`);
        console.log(`   📋 Verdict: ${validationResult.verdict || "Unknown"}`);
        console.log(`   ✓ Correct answer valid: ${validationResult.isCorrectAnswerValid ? "Yes" : "No"}`);
        console.log(`   ✓ Explanation consistent: ${validationResult.explanationConsistent ? "Yes" : "No"}`);

        if (validationResult.correctAnswerReasoning) {
          console.log(`   💡 Reasoning: ${validationResult.correctAnswerReasoning}`);
        }

        if (validationResult.otherAnswersPossible && validationResult.otherAnswersPossible.length > 0) {
          console.log(`   ⚠️  Other possible answers: ${validationResult.otherAnswersPossible.join(", ")}`);
        }

        if (validationResult.ambiguityType && validationResult.ambiguityType !== "other") {
          console.log(`   🔍 Ambiguity type: ${validationResult.ambiguityType}`);
        }

        if (validationResult.ambiguityReasoning) {
          console.log(`   📝 Ambiguity reasoning: ${validationResult.ambiguityReasoning}`);
        }

        if (validationResult.ambiguityFixFailureReason) {
          console.log(`   🛠️  Fix failure reason: ${validationResult.ambiguityFixFailureReason}`);
        }

        if (validationResult.fixedQuestion) {
          console.log(`   ✏️  Fixed question: ${validationResult.fixedQuestion}`);
        }

        // Try to fix the question if auto-fix is enabled
        let fixAttemptCount = 0;
        let currentValidationResult = validationResult;
        let wasFixed = false;

        while (fixAttemptCount < MAX_FIX_ATTEMPTS && currentValidationResult.disabled) {
          fixAttemptCount++;
          console.log(`   🔧 Fix attempt ${fixAttemptCount}/${MAX_FIX_ATTEMPTS}...`);

          // Get current question data
          const category = await Category.findOne(
            { _id: categoryId, "questions._id": questionId },
            { "questions.$": 1 }
          );
          const currentQuestion = category?.questions?.[0];

          if (!currentQuestion || !currentQuestion.validation) {
            console.log(`   ❌ Could not retrieve question or validation data for fix`);
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

          // Attempt fix
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
            wasFixed = true;
            enabledQuestionCount++;
            disabledQuestionCount--;
            fixedQuestionCount++;
            currentValidationResult = revalidationResult;
            break;
          } else {
            console.log(`   ⚠️  Question still disabled after fix attempt ${fixAttemptCount}`);
            console.log(`   New verdict: ${revalidationResult.verdict || "Unknown"}`);
            currentValidationResult = revalidationResult;
          }
        }

        if (wasFixed) {
          // Question was fixed, continue to duplicate check
          console.log(`   ✅ Question fixed! Continuing to duplicate check...`);
        } else {
          console.log(`   ⏭️  Skipping difficulty population (could not fix).\n`);
          continue;
        }
      }

      const duplicateResult = await processSingleQuestion(categoryId, questionId);
      if (!duplicateResult?.success) {
        throw new Error(
          `Duplicate check failed for question ${questionId}: ${duplicateResult?.reason || "Unknown duplicate-check error."}`
        );
      }

      if (duplicateResult.duplicateFound) {
        disabledQuestionCount += 1;
        console.log(
          `❌ Question ${questionId} was disabled by duplicate check after ${duplicateResult.comparedCount} comparison(s). Skipping remaining pipeline steps.`
        );
        continue;
      }

      await populateDifficulty(String(categoryId), String(questionId));
      enabledQuestionCount += 1;

      // Add this validated question to existingQuestions for the current category
      const categoryDoc = await Category.findById(categoryId).lean();
      const validatedQuestion = categoryDoc?.questions?.find(q => String(q._id) === String(questionId));
      if (validatedQuestion?.text) {
        addToExistingQuestions(validatedQuestion.text);
      }
    } catch (error) {
      try {
        await disableQuestionOnPostGenerationFailure(
          questionId,
          "Disabled automatically because post-generation checks errored during populate flow."
        );
      } catch (disableError) {
        console.error(
          `Failed to disable question ${questionId} after validation error:`,
          disableError.message
        );
      }
      disabledQuestionCount += 1;
      console.error(`Post-generation pipeline failed for question ${questionId}:`, error.message);
    }
  }

  return {
    enabledQuestionCount,
    disabledQuestionCount,
    fixedQuestionCount,
  };
}

async function getEnabledQuestionCount(categoryId) {
  const category = await Category.findById(categoryId)
    .select("questions.disabled")
    .lean();

  if (!category) {
    return null;
  }

  return (category.questions || []).filter((question) => !question.disabled).length;
}

async function populateCategory(categoryId, difficultyHint, options = {}) {
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      console.error(`❌ Category not found: ${categoryId}`);
      return { addedCount: 0, duplicateQuestion: null };
    }

    // Load existing questions for this category
    loadExistingQuestions(category);

    const maxEnabledQuestions = Number(
      options.maxEnabledQuestions ?? DEFAULT_MAX_ENABLED_QUESTIONS_PER_CATEGORY
    );
    const activeQuestions = category.questions.filter(q => !q.disabled).length;
    if (activeQuestions >= maxEnabledQuestions) {
      console.log(`🚫 Skipping ${category.name} (already has ${activeQuestions} questions).`);
      return { addedCount: 0, duplicateQuestion: null };
    }

    console.log(`🔹 ${category.name}: ${activeQuestions} questions. Fetching a new one.`);

    // 🧠 Step 1: Generate new question(s)
    const fetchedQuestions = await fetchQuestions(category.name);
    if (!fetchedQuestions?.length) {
      console.log("⚠️ No question returned from Ollama.");
      return { addedCount: 0, duplicateQuestion: null };
    }

    // 🧠 Step 2: Add them to category object
    const { addedCount, addedQuestionIds } = await addQuestionsToCategory(category, fetchedQuestions);
    if (addedCount === 0) {
      console.log("⚠️ No new question added (duplicate hash skipped).");
      const generatedQuestion = String(fetchedQuestions[0]?.question || "").trim();
      const generatedHash = generatedQuestion ? generateQuestionHash(generatedQuestion) : null;
      const isDuplicate = generatedHash
        ? category.questions.some((x) => x.hash === generatedHash)
        : false;

      return {
        addedCount: 0,
        duplicateQuestion: isDuplicate ? generatedQuestion : null,
      };
    }

    // 🧠 Step 3: Save the updated category to MongoDB
    category.disabled = false;
    await category.save();
    const postGenerationResult = await runPostGenerationScripts(category._id, addedQuestionIds);
    const enabledAddedCount = Number(postGenerationResult?.enabledQuestionCount || 0);
    const disabledInPipelineCount = Number(postGenerationResult?.disabledQuestionCount || 0);
    const fixedCount = Number(postGenerationResult?.fixedQuestionCount || 0);

    if (disabledInPipelineCount > 0) {
      if (enabledAddedCount > 0) {
        const fixMsg = fixedCount > 0 ? ` (${fixedCount} auto-fixed)` : "";
        console.warn(
          `⚠️ ${disabledInPipelineCount} generated question(s) were disabled in pipeline. ${enabledAddedCount} question(s) remained enabled${fixMsg} in ${category.name}.`
        );
      } else {
        const questionNoun = addedCount === 1 ? "question" : "questions";
        const wasWere = addedCount === 1 ? "was" : "were";
        console.warn(
          `⚠️ Generated ${questionNoun} ${wasWere} not added to ${category.name} because ${questionNoun} ${wasWere} disabled in pipeline.`
        );
      }
    } else {
      const fixMsg = fixedCount > 0 ? ` (${fixedCount} auto-fixed)` : "";
      console.log(`✅ Added ${enabledAddedCount} question(s)${fixMsg} to ${category.name}.`);
    }

    return { addedCount: enabledAddedCount, duplicateQuestion: null };

    /*
    // 🧠 Step 4: Re-fetch category to ensure IDs are present
    const refreshedCategory = await Category.findById(categoryId);

    // 🧠 Step 5: For each added question, check for duplicates within this category
    for (const q of fetchedQuestions) {
      const savedQuestion = refreshedCategory.questions.find(x => x.text === q.question);
      if (savedQuestion) {
        await checkQuestionInSameCategory(refreshedCategory, savedQuestion);
      }
    }
      */

  } catch (error) {
    console.error("❌ Error populating category:", error.message);
    return { addedCount: 0, duplicateQuestion: null };
  }
}


async function addQuestionsToCategory(category, questions) {
  let added = 0;
  const addedQuestionIds = [];

  for (const q of questions) {
    const validation = validateQuestionShape(q);
    if (!validation.isValid) {
      console.log(`âš ï¸ Discarded generated question "${q?.question || "(no text)"}": ${validation.reason}`);
      continue;
    }

    const hash = generateQuestionHash(q.question);
    rememberAvoidedQuestion(q.question);

    if (category.questions.some(x => x.hash === hash)) {
      console.log(`⚠️ Duplicate skipped: ${q.question}`);
      continue;
    }

    const newQuestionId = new mongoose.Types.ObjectId();
    category.questions.push({
      _id: newQuestionId,
      text: q.question,
      answers: q.answers.map(a => ({ text: a, correctCount: 0, incorrectCount: 0 })),
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      source_domain: q.source_domain,
      source_title: q.source_title,
      source_quote: q.source_quote,
      difficulty_level: q.difficulty_level,
      difficulty_rationale: q.difficulty_rationale,
      timesLoaded: 0,
      popularity: 0,
      disabled: false,
      timesAnsweredCorrectly: 0,
      timesAnsweredIncorrectly: 0,
      hash,
      version: version
    });

    added++;
    addedQuestionIds.push(newQuestionId.toString());
  }

  return { addedCount: added, addedQuestionIds };
}

async function checkQuestionInSameCategory(category, newQuestion) {
  console.log(`\n🔍 Checking "${newQuestion.text}" against others in ${category.name}`);

  // Skip disabled questions and itself
  const otherQuestions = category.questions.filter(
    q => !q.disabled && q._id.toString() !== newQuestion._id.toString()
  );

  if (otherQuestions.length === 0) {
    console.log("ℹ️ No other questions to compare against.");
    return;
  }

  // 🔥 Reuse your existing processSingleQuestion() helper
  await processSingleQuestion(category._id, newQuestion._id);

  console.log(`✅ Finished duplicate check within "${category.name}"`);
}


async function populateCategoryLoop(categoryId, iterations, difficultyHint, options = {}) {
  const maxEnabledQuestions = Number(
    options.maxEnabledQuestions ?? DEFAULT_MAX_ENABLED_QUESTIONS_PER_CATEGORY
  );
  let totalAdded = 0;
  let sameDuplicateStreak = 0;
  let lastDuplicateHash = null;

  try {
    for (let i = 0; i < iterations; i++) {
      const enabledQuestionCount = await getEnabledQuestionCount(categoryId);
      if (enabledQuestionCount === null) {
        console.log(`Stopping early: category ${categoryId} no longer exists.`);
        break;
      }

      if (enabledQuestionCount >= maxEnabledQuestions) {
        console.log(
          `Category ${categoryId} reached ${enabledQuestionCount}/${maxEnabledQuestions} enabled questions. Moving to next category.`
        );
        break;
      }
      console.log(`\n🔄 Iteration ${i + 1}/${iterations} for category ${categoryId}`);
      const result = await populateCategory(categoryId, difficultyHint, {
        maxEnabledQuestions,
      });
      const added = Number(result?.addedCount || 0);
      totalAdded += added;

      if (added > 0) {
        sameDuplicateStreak = 0;
        lastDuplicateHash = null;
        continue;
      }

      const duplicateQuestion = String(result?.duplicateQuestion || "").trim();

      if (duplicateQuestion) {
        const duplicateHash = generateQuestionHash(duplicateQuestion);
        if (duplicateHash === lastDuplicateHash) {
          sameDuplicateStreak++;
        } else {
          sameDuplicateStreak = 1;
          lastDuplicateHash = duplicateHash;
        }

        if (sameDuplicateStreak >= MAX_SAME_DUPLICATE_STREAK) {
          console.log(
            `🛑 Stopping early: same duplicate generated ${sameDuplicateStreak} times in a row: "${duplicateQuestion}"`
          );
          break;
        }
      } else {
        sameDuplicateStreak = 0;
        lastDuplicateHash = null;
      }

    }

    return totalAdded;
  } finally {
    avoidedQuestions.length = 0;
    avoidedQuestionSet.clear();
    console.log("🧹 Cleared avoided questions list after loop.");
  }
}

module.exports = { populateCategory, populateCategoryLoop, tryFixValidationFailure };
