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
const { normalizeJsonText, parseJsonObject } = require("./jsonParsingHelper");
const {
  buildDomainPrompt,
  buildPrimaryPrompt,
  buildCriticPrompt,
  buildIndependentPrompt,
  buildAmbiguityFixabilityPrompt,
  buildAmbiguityFixPrompt,
} = require("./prompts/validateQuestionsPrompts");
const { runWithConcurrencyPool } = require("./concurrencyPool");

const CURRENT_VALIDATION_VERSION = 0.09;
const LOG_PREFIX = "🔹";

const ERROR_LOG_PREFIX = "ERROR";

function prependLogPrefix(args, prefix = LOG_PREFIX) {
  if (!Array.isArray(args) || args.length === 0) {
    return [prefix];
  }

  const [first, ...rest] = args;
  if (typeof first === "string") {
    return [`${prefix} ${first}`, ...rest];
  }

  return [prefix, first, ...rest];
}

function logInfo(...args) {
  console.log(...prependLogPrefix(args));
}

function logWarn(...args) {
  console.warn(...prependLogPrefix(args));
}

function logError(...args) {
  console.error(...prependLogPrefix(args, ERROR_LOG_PREFIX));
}

try {
  assertOllamaSetup();
} catch (error) {
  logError(error.message);
  process.exit(1);
}

function parseParallelLimit(args) {
  const aliases = ["--parallel", "--concurrency", "-p", "-n"];
  let rawValue = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [key, inlineValue] = arg.split("=");

    if (!aliases.includes(key)) {
      continue;
    }

    rawValue = inlineValue ?? args[index + 1];
    break;
  }

  if (rawValue == null) {
    return 1;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    logWarn(`Invalid parallel limit '${rawValue}'. Falling back to 1.`);
    return 1;
  }

  return parsedValue;
}

async function processInParallelBatches(items, concurrency, worker) {
  const results = await runWithConcurrencyPool(items, concurrency, (item) => worker(item));
  results
    .filter((result) => result.status === "rejected")
    .forEach((result) => {
      logError(
        "Error processing validation item:",
        result.reason?.message ?? result.reason,
      );
    });
}

async function callOllama(prompt) {
  return callOllamaForText({
    prompt: `${prompt}\n\nSTRICT FORMAT: Respond with exactly one JSON object only. Do not output <think> tags, markdown, or any prose before/after JSON.`,
    presetName: "validateQuestions",
  });
}

function normalizeQuestionLogText(questionText) {
  const text = String(questionText ?? "").trim();
  if (!text) return "(unknown)";
  if (text.length <= 180) return text;
  return `${text.slice(0, 177)}...`;
}

function questionLogContext(questionId, questionText) {
  return `Question ${questionId} | Text: "${normalizeQuestionLogText(questionText)}"`;
}

function parseAmbiguityClassifierFallback(raw) {
  const cleaned = normalizeJsonText(raw, {
    stripMarkdown: true,
    stripThinkTags: true,
    stripIntroPrefix: true,
    normalizeQuotes: true,
  });
  if (!cleaned) return null;

  const booleanMatch = cleaned.match(
    /"can_be_fixed_by_rewording"\s*:\s*(true|false|1|0|"true"|"false")/i,
  );
  const typeMatch = cleaned.match(
    /"ambiguity_type"\s*:\s*"?(scope|approximation|vague_wording|subjective|multiple_valid_answers|other)"?/i,
  );
  if (!booleanMatch || !typeMatch) {
    return null;
  }

  const boolToken = String(booleanMatch[1]).replace(/"/g, "").toLowerCase();
  const canBeFixedByRewording = boolToken === "true" || boolToken === "1";

  let reasoning = "";
  const completeReasoningMatch = cleaned.match(/"reasoning"\s*:\s*"([^"]*)"/i);
  if (completeReasoningMatch) {
    reasoning = completeReasoningMatch[1].trim();
  } else {
    const partialReasoningMatch = cleaned.match(/"reasoning"\s*:\s*"([\s\S]*)$/i);
    if (partialReasoningMatch) {
      reasoning = partialReasoningMatch[1]
        .replace(/"\s*}\s*$/g, "")
        .trim();
    }
  }

  return {
    can_be_fixed_by_rewording: canBeFixedByRewording,
    ambiguity_type: String(typeMatch[1]).toLowerCase(),
    reasoning,
  };
}

function parseAmbiguityFixFallback(raw) {
  const cleaned = normalizeJsonText(raw, {
    stripMarkdown: true,
    stripThinkTags: true,
    stripIntroPrefix: true,
    normalizeQuotes: true,
  });
  if (!cleaned) return null;

  const completeMatch = cleaned.match(/"fixed_question"\s*:\s*"([^"]+)"/i);
  if (completeMatch && completeMatch[1]) {
    return { fixed_question: completeMatch[1].trim() };
  }

  const partialMatch = cleaned.match(/"fixed_question"\s*:\s*"([\s\S]*)$/i);
  if (!partialMatch || !partialMatch[1]) {
    return null;
  }

  const fixedQuestion = partialMatch[1]
    .replace(/"\s*}\s*$/g, "")
    .trim();

  if (!fixedQuestion) {
    return null;
  }

  return { fixed_question: fixedQuestion };
}

function parseQuotedArrayItems(value) {
  const items = [];
  const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  let match;

  while ((match = regex.exec(String(value || ""))) !== null) {
    const rawItem = match[1] ?? match[2] ?? "";
    const normalized = String(rawItem)
      .replace(/\\"/g, "\"")
      .replace(/\\'/g, "'")
      .trim();
    if (normalized) {
      items.push(normalized);
    }
  }

  return items;
}

function parseIndependentFallback(raw) {
  const cleaned = normalizeJsonText(raw, {
    stripMarkdown: true,
    stripThinkTags: true,
    stripIntroPrefix: true,
    normalizeQuotes: true,
  });
  if (!cleaned) return null;

  const factMatch = cleaned.match(
    /["']?is_factually_correct["']?\s*:\s*(true|false|1|0|"true"|"false")/i,
  );
  const verdictMatch = cleaned.match(
    /["']?verdict["']?\s*:\s*["']?(Correct|Incorrect|Ambiguous)["']?/i,
  );

  const alternativesMatch = cleaned.match(
    /["']?alternative_correct_answers["']?\s*:\s*\[([\s\S]*?)\]/i,
  );
  const alternativeCorrectAnswers = alternativesMatch
    ? parseQuotedArrayItems(alternativesMatch[1])
    : [];

  let reasons = "";
  const fullReasonsDouble = cleaned.match(/["']?reasons["']?\s*:\s*"([^"]*)"/i);
  const fullReasonsSingle = cleaned.match(/["']?reasons["']?\s*:\s*'([^']*)'/i);
  if (fullReasonsDouble && fullReasonsDouble[1]) {
    reasons = fullReasonsDouble[1].trim();
  } else if (fullReasonsSingle && fullReasonsSingle[1]) {
    reasons = fullReasonsSingle[1].trim();
  } else {
    const partialReasonsDouble = cleaned.match(/["']?reasons["']?\s*:\s*"([\s\S]*)$/i);
    const partialReasonsSingle = cleaned.match(/["']?reasons["']?\s*:\s*'([\s\S]*)$/i);
    const partial = partialReasonsDouble?.[1] || partialReasonsSingle?.[1] || "";
    reasons = String(partial)
      .replace(/["']?\s*}\s*$/g, "")
      .trim();
  }

  if (!factMatch && !verdictMatch) {
    return null;
  }

  const parsedFact = factMatch ? parseBooleanLike(factMatch[1]) : null;
  const normalizedVerdict = verdictMatch
    ? String(verdictMatch[1]).trim()
    : parsedFact === false
      ? "Incorrect"
      : alternativeCorrectAnswers.length > 0
        ? "Ambiguous"
        : "Correct";

  const isFactuallyCorrect = parsedFact == null
    ? normalizedVerdict !== "Incorrect"
    : parsedFact;

  return {
    is_factually_correct: isFactuallyCorrect,
    alternative_correct_answers: alternativeCorrectAnswers,
    reasons,
    verdict: normalizedVerdict,
  };
}

async function runPrompt(prompt, label, questionId, options = {}) {
  const fallbackParser = options?.fallbackParser;
  const questionText = options?.questionText;
  try {
    const raw = await callOllama(prompt);
    let parsed = parseJsonObject(raw, {
      normalizeOptions: {
        stripThinkTags: true,
        stripIntroPrefix: true,
      },
    });

    if (!parsed && typeof fallbackParser === "function") {
      parsed = fallbackParser(raw);
      if (parsed) {
        logWarn(
          `WARN [${label}] Recovered partial JSON for ${questionLogContext(questionId, questionText)} using fallback parser.`,
        );
      }
    }

    if (!parsed) {
      logError(
        `[${label}] Invalid JSON for ${questionLogContext(questionId, questionText)}. Raw snippet:`,
        String(raw || "").slice(0, 300),
      );
      return null;
    }

    return parsed;
  } catch (error) {
    logError(
      `[${label}] Error for ${questionLogContext(questionId, questionText)}:`,
      error.message,
    );
    return null;
  }
}

function parseBooleanLike(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "0"].includes(normalized)) return false;
  }
  return null;
}

function toQuestionContext(question) {
  const questionText = String(question?.text ?? "").trim();
  const answers = Array.isArray(question?.answers)
    ? question.answers
        .map((answer) => {
          if (answer && typeof answer === "object") return String(answer.text ?? "").trim();
          return String(answer ?? "").trim();
        })
        .filter(Boolean)
    : [];
  const correctAnswer = String(question?.correct_answer ?? "").trim();
  return {
    questionText,
    answers,
    correctAnswer,
  };
}

function normalizeAmbiguityType(value) {
  const allowed = new Set([
    "scope",
    "approximation",
    "vague_wording",
    "subjective",
    "multiple_valid_answers",
    "other",
  ]);
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return allowed.has(normalized) ? normalized : "other";
}

function sanitizeFixedQuestion(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidFixedQuestion(value) {
  if (!value) return false;
  const wordCount = value.split(/\s+/).filter(Boolean).length;
  return wordCount > 0 && wordCount <= 14;
}

function buildAmbiguityFixMetadata(overrides = {}) {
  return {
    ambiguity_fix_attempted: false,
    can_be_fixed_by_rewording: false,
    ambiguity_type: "other",
    ambiguity_reasoning: "",
    ambiguity_fix_applied: false,
    fixed_question: "",
    ambiguity_fix_failure_reason: "",
    ...overrides,
  };
}

async function evaluateQuestion(question) {
  try {
    const domainPrompt = buildDomainPrompt(question);
    const domain = await runPrompt(domainPrompt, "DOMAIN", question._id, {
      questionText: question?.text,
    });
    const authoritative = domain?.has_authoritative_answer === true;

    const primaryPrompt = buildPrimaryPrompt(question, authoritative);
    const primary = await runPrompt(primaryPrompt, "PRIMARY", question._id, {
      questionText: question?.text,
    });
    if (!primary) {
      throw new Error("Primary validation failed");
    }

    const criticPrompt = buildCriticPrompt(question, authoritative);
    const critic = await runPrompt(criticPrompt, "CRITIC", question._id, {
      questionText: question?.text,
    });

    const independentPrompt = buildIndependentPrompt(question, authoritative);
    const independent = await runPrompt(independentPrompt, "INDEPENDENT", question._id, {
      fallbackParser: parseIndependentFallback,
      questionText: question?.text,
    });

    const normalizedPrimaryVerdict = String(primary.final_verdict || "Ambiguous").trim();
    let finalVerdict =
      normalizedPrimaryVerdict === "Correct" ||
      normalizedPrimaryVerdict === "Incorrect" ||
      normalizedPrimaryVerdict === "Ambiguous"
        ? normalizedPrimaryVerdict
        : "Ambiguous";
    let isCorrectAnswerValid = !!primary.is_correct_answer_valid;
    const explanationConsistent = !!primary.explanation_consistent;

    const otherAnswers = new Set();
    if (Array.isArray(primary.other_answers_possible)) {
      primary.other_answers_possible.forEach((answer) => otherAnswers.add(answer));
    }

    if (critic) {
      if (Array.isArray(critic.alternative_answers)) {
        critic.alternative_answers.forEach((answer) => otherAnswers.add(answer));
      }

      if (critic.has_issue && critic.issue_type && critic.issue_type !== "None") {
        if (critic.issue_type === "Incorrect") {
          finalVerdict = "Incorrect";
          isCorrectAnswerValid = false;
        } else if (critic.issue_type === "Ambiguous" && finalVerdict !== "Incorrect") {
          finalVerdict = "Ambiguous";
        }
      }
    }

    if (independent) {
      const independentVerdict = String(independent.verdict || "").trim();
      if (!independent.is_factually_correct || independentVerdict === "Incorrect") {
        finalVerdict = "Incorrect";
        isCorrectAnswerValid = false;
      } else {
        const hasAlternatives =
          Array.isArray(independent.alternative_correct_answers) &&
          independent.alternative_correct_answers.length > 0;

        if (hasAlternatives && finalVerdict !== "Incorrect") {
          finalVerdict = "Ambiguous";
          independent.alternative_correct_answers.forEach((answer) => otherAnswers.add(answer));
        }

        if (independentVerdict === "Ambiguous" && finalVerdict !== "Incorrect") {
          finalVerdict = "Ambiguous";
        }
      }
    }

    if (otherAnswers.size > 0 && finalVerdict !== "Incorrect") {
      finalVerdict = "Ambiguous";
    }

    const mergedCorrectReasoning = [
      primary.correct_answer_reasoning,
      critic?.reasons ? `Critic: ${critic.reasons}` : "",
      independent?.reasons ? `Independent: ${independent.reasons}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const mergedExplanationReasoning =
      primary.explanation_reasoning || "Based on primary evaluation.";

    return {
      is_correct_answer_valid: isCorrectAnswerValid,
      correct_answer_reasoning: mergedCorrectReasoning,
      explanation_consistent: explanationConsistent,
      explanation_reasoning: mergedExplanationReasoning,
      other_answers_possible: Array.from(otherAnswers),
      final_verdict: finalVerdict,
    };
  } catch (error) {
    logError(
      `Validation failed for ${questionLogContext(question?._id, question?.text)}:`,
      error.message,
    );
    return null;
  }
}

async function tryFixAmbiguousQuestion(question) {
  const { questionText, answers, correctAnswer } = toQuestionContext(question);
  if (!questionText || answers.length === 0 || !correctAnswer) {
    return buildAmbiguityFixMetadata({
      ambiguity_fix_attempted: true,
      ambiguity_fix_failure_reason: "Missing question context for ambiguity-fix prompts.",
    });
  }

  const fixabilityPrompt = buildAmbiguityFixabilityPrompt(question);
  const fixability = await runPrompt(fixabilityPrompt, "AMBIGUITY_CLASSIFIER", question._id, {
    fallbackParser: parseAmbiguityClassifierFallback,
    questionText: question?.text,
  });
  if (!fixability) {
    return buildAmbiguityFixMetadata({
      ambiguity_fix_attempted: true,
      ambiguity_fix_failure_reason: "Failed to classify ambiguity fixability.",
    });
  }

  const canBeFixed = parseBooleanLike(fixability.can_be_fixed_by_rewording) === true;
  const ambiguityType = normalizeAmbiguityType(fixability.ambiguity_type);
  const ambiguityReasoning = String(fixability.reasoning ?? "").trim();

  if (!canBeFixed) {
    logInfo(
      `INFO [AMBIGUITY_CLASSIFIER] ${questionLogContext(question._id, question?.text)} cannot be fixed by rewording. Type: ${ambiguityType}. Reason: ${ambiguityReasoning || "No reason provided."}`,
    );
    return buildAmbiguityFixMetadata({
      ambiguity_fix_attempted: true,
      can_be_fixed_by_rewording: false,
      ambiguity_type: ambiguityType,
      ambiguity_reasoning: ambiguityReasoning,
      ambiguity_fix_failure_reason: "Ambiguity not fixable by rewording only.",
    });
  }

  const fixPrompt = buildAmbiguityFixPrompt(question, ambiguityReasoning);
  const fixResponse = await runPrompt(fixPrompt, "AMBIGUITY_FIX", question._id, {
    fallbackParser: parseAmbiguityFixFallback,
    questionText: question?.text,
  });
  const fixedQuestion = sanitizeFixedQuestion(fixResponse?.fixed_question);
  if (!isValidFixedQuestion(fixedQuestion)) {
    return buildAmbiguityFixMetadata({
      ambiguity_fix_attempted: true,
      can_be_fixed_by_rewording: true,
      ambiguity_type: ambiguityType,
      ambiguity_reasoning: ambiguityReasoning,
      fixed_question: fixedQuestion,
      ambiguity_fix_failure_reason: "Generated fixed question is empty or exceeds 14 words.",
    });
  }

  const normalizedOriginal = questionText.toLowerCase();
  const normalizedFixed = fixedQuestion.toLowerCase();
  if (normalizedOriginal === normalizedFixed) {
    return buildAmbiguityFixMetadata({
      ambiguity_fix_attempted: true,
      can_be_fixed_by_rewording: true,
      ambiguity_type: ambiguityType,
      ambiguity_reasoning: ambiguityReasoning,
      fixed_question: fixedQuestion,
      ambiguity_fix_failure_reason: "Generated fixed question is unchanged.",
    });
  }

  const fixedQuestionPayload = {
    ...question,
    text: fixedQuestion,
  };
  const fixedValidation = await evaluateQuestion(fixedQuestionPayload);
  if (
    fixedValidation &&
    fixedValidation.final_verdict === "Correct" &&
    fixedValidation.explanation_consistent !== false
  ) {
    return {
      ...buildAmbiguityFixMetadata({
        ambiguity_fix_attempted: true,
        can_be_fixed_by_rewording: true,
        ambiguity_type: ambiguityType,
        ambiguity_reasoning: ambiguityReasoning,
        ambiguity_fix_applied: true,
        fixed_question: fixedQuestion,
      }),
      fixed_validation: fixedValidation,
    };
  }

  return buildAmbiguityFixMetadata({
    ambiguity_fix_attempted: true,
    can_be_fixed_by_rewording: true,
    ambiguity_type: ambiguityType,
    ambiguity_reasoning: ambiguityReasoning,
    fixed_question: fixedQuestion,
    ambiguity_fix_failure_reason:
      "Fixed wording did not produce a clear, correct validation result.",
  });
}

async function validateQuestion(question) {
  const evaluated = await evaluateQuestion(question);
  if (!evaluated) {
    return null;
  }

  if (evaluated.final_verdict !== "Ambiguous") {
    return {
      ...evaluated,
      ...buildAmbiguityFixMetadata(),
    };
  }

  const ambiguityFixResult = await tryFixAmbiguousQuestion(question);
  if (ambiguityFixResult.fixed_validation && ambiguityFixResult.ambiguity_fix_applied) {
    return {
      ...ambiguityFixResult.fixed_validation,
      ...ambiguityFixResult,
    };
  }

  return {
    ...evaluated,
    ...ambiguityFixResult,
  };
}

function buildValidationUpdate(parsed) {
  const shouldDisable =
    parsed.final_verdict === "Incorrect" ||
    parsed.final_verdict === "Ambiguous" ||
    parsed.explanation_consistent === false;

  return {
    shouldDisable,
    validation: {
      is_correct_answer_valid: parsed.is_correct_answer_valid,
      correct_answer_reasoning: parsed.correct_answer_reasoning,
      explanation_consistent: parsed.explanation_consistent,
      explanation_reasoning: parsed.explanation_reasoning,
      other_answers_possible: parsed.other_answers_possible,
      final_verdict: parsed.final_verdict,
      ambiguity_fix_attempted: parsed.ambiguity_fix_attempted,
      can_be_fixed_by_rewording: parsed.can_be_fixed_by_rewording,
      ambiguity_type: parsed.ambiguity_type,
      ambiguity_reasoning: parsed.ambiguity_reasoning,
      ambiguity_fix_applied: parsed.ambiguity_fix_applied,
      fixed_question: parsed.fixed_question,
      ambiguity_fix_failure_reason: parsed.ambiguity_fix_failure_reason,
      validationVersion: CURRENT_VALIDATION_VERSION,
    },
  };
}

function logValidationPipelineSummary(questionId, questionText, parsed, shouldDisable) {
  const otherAnswersCount = Array.isArray(parsed?.other_answers_possible)
    ? parsed.other_answers_possible.length
    : 0;
  const ambiguityState = parsed?.final_verdict === "Ambiguous"
    ? `fixAttempted=${parsed?.ambiguity_fix_attempted ? "yes" : "no"} fixable=${parsed?.can_be_fixed_by_rewording ? "yes" : "no"} fixApplied=${parsed?.ambiguity_fix_applied ? "yes" : "no"}`
    : "fixAttempted=n/a fixable=n/a fixApplied=n/a";

  logInfo(
    `PIPELINE ${questionLogContext(questionId, questionText)} | verdict=${parsed?.final_verdict || "Unknown"} | answerValid=${parsed?.is_correct_answer_valid ? "yes" : "no"} | explanationConsistent=${parsed?.explanation_consistent ? "yes" : "no"} | otherAnswers=${otherAnswersCount} | ${ambiguityState} | disabled=${shouldDisable ? "yes" : "no"}`,
  );
}

function logValidationOutcome(questionId, questionText, parsed, shouldDisable) {
  if (shouldDisable) {
    const reason = parsed?.ambiguity_fix_failure_reason || parsed?.correct_answer_reasoning || "Validation rules failed.";
    logWarn(
      `⚠️ DISABLED ${questionLogContext(questionId, questionText)} | verdict=${parsed?.final_verdict || "Unknown"} | reason=${normalizeQuestionLogText(reason)}`,
    );
    return;
  }

  if (parsed?.ambiguity_fix_applied && parsed?.fixed_question) {
    logInfo(
      `🛠️ REWORDED ${questionLogContext(questionId, questionText)} | verdict=${parsed?.final_verdict || "Unknown"} | fixedQuestion="${normalizeQuestionLogText(parsed.fixed_question)}"`,
    );
    return;
  }

  logInfo(
    `✅ VALID ${questionLogContext(questionId, questionText)} | verdict=${parsed?.final_verdict || "Unknown"}`,
  );
}

async function validateAndPersistQuestion(categoryId, questionId, questionOverride = null) {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    logError(`Invalid categoryId for validation: ${categoryId}`);
    return { success: false, disabled: true };
  }

  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    logError(`Invalid ${questionLogContext(questionId, "")} for validation.`);
    return { success: false, disabled: true };
  }

  let question = questionOverride;
  if (!question) {
    const category = await Category.findOne(
      { _id: categoryId, "questions._id": questionId },
      {
        name: 1,
        questions: { $elemMatch: { _id: questionId } },
      },
    );
    question = category?.questions?.[0] || null;
  }

  if (!question) {
    logError(
      `Could not load ${questionLogContext(questionId, "")} in category ${categoryId} for validation.`,
    );
    return { success: false, disabled: true };
  }

  const parsed = await validateQuestion(question);
  if (!parsed) {
    return { success: false, disabled: true };
  }

  const { shouldDisable, validation } = buildValidationUpdate(parsed);
  logValidationPipelineSummary(questionId, question?.text, parsed, shouldDisable);
  const updateSet = {
    "questions.$.validation": validation,
    "questions.$.disabled": shouldDisable,
  };
  if (validation.ambiguity_fix_applied && validation.fixed_question) {
    updateSet["questions.$.text"] = validation.fixed_question;
  }

  await Category.updateOne(
    { _id: categoryId, "questions._id": questionId },
    {
      $set: updateSet,
    },
  );

  logInfo(
    `${questionLogContext(questionId, question?.text)} updated | Verdict: ${parsed.final_verdict} | Disabled: ${shouldDisable}`,
  );

  logValidationOutcome(questionId, question?.text, parsed, shouldDisable);

  return {
    success: true,
    disabled: shouldDisable,
    verdict: parsed.final_verdict,
    fixedQuestion: validation.ambiguity_fix_applied ? validation.fixed_question : "",
  };
}

async function validateAllCategories() {
  try {
    const parallelLimit = parseParallelLimit(process.argv.slice(2));

    await connectDB();
    logInfo("Connected to MongoDB");
    logInfo(`Running question validations with parallel limit: ${parallelLimit}`);

    const allCategories = await Category.find({}, { name: 1 });
    const allCategoryNames = allCategories.map((category) => category.name);

    const categories = await Category.aggregate([
      {
        $project: {
          name: 1,
          questions: {
            $filter: {
              input: "$questions",
              as: "q",
              cond: {
                $and: [
                  { $ne: ["$$q.disabled", true] },
                  {
                    $or: [
                      { $eq: ["$$q.validation", null] },
                      { $eq: ["$$q.validation.validationVersion", null] },
                      { $lt: ["$$q.validation.validationVersion", CURRENT_VALIDATION_VERSION] },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          "questions.0": { $exists: true },
        },
      },
    ]);

    const processedNames = categories.map((category) => category.name);
    const skippedNames = allCategoryNames.filter((name) => !processedNames.includes(name));
    if (skippedNames.length > 0) {
      logInfo("Skipped categories (all questions validated):");
      skippedNames.forEach((name) => logInfo("  -", name));
    }

    if (categories.length === 0) {
      logInfo("No unvalidated questions found.");
      mongoose.connection.close();
      return;
    }

    logInfo(`Found ${categories.length} categories with unvalidated questions.`);
    for (const category of categories) {
      logInfo(`Validating category: ${category.name} (${category.questions.length} questions)`);
      await processInParallelBatches(category.questions, parallelLimit, async (question) => {
        await validateAndPersistQuestion(category._id, question._id, question);
      });
    }

    logInfo("All categories validated.");
    mongoose.connection.close();
  } catch (error) {
    logError("Error validating categories:", error.message);
    mongoose.connection.close();
  }
}

module.exports = {
  CURRENT_VALIDATION_VERSION,
  validateQuestion,
  validateAndPersistQuestion,
  validateAllCategories,
};

if (require.main === module) {
  validateAllCategories();
}
