require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const Category = require("../models/categoryModel");
const {
  OLLAMA_URL,
  assertOllamaSetup,
  callOllama,
  getOllamaResponseText,
} = require("../services/ollamaClient");

const { buildQuestionPrompt } = require("./prompts/questionPrompt");
const { validateAndPersistQuestion } = require("./validateQuestions");
const { populateDifficulty } = require("./populateDifficulty");
//const { processSingleQuestion } = require("./validateDuplicateQuestions");


// ==== GLOBAL CONFIG ====
const avoidedQuestions = [];
const avoidedQuestionSet = new Set();
const MAX_AVOIDED_QUESTIONS = Number(process.env.POPULATE_MAX_AVOIDED_QUESTIONS || 120);
const MAX_CONSECUTIVE_NO_ADD = Number(process.env.POPULATE_MAX_CONSECUTIVE_NO_ADD || 5);
const MAX_SAME_DUPLICATE_STREAK = Number(process.env.POPULATE_MAX_SAME_DUPLICATE_STREAK || 3);

try {
  assertOllamaSetup();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

console.log(`🚀 Ollama API set to: ${OLLAMA_URL}`);

// ==== HELPER FUNCTIONS ====

function generateQuestionHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function buildAvoidSection() {
  if (avoidedQuestions.length === 0) return "";
  return `Do NOT generate any of these questions (nor semantically similar ones).
Use a different fact/subtopic from all items below:
${avoidedQuestions.map(q => `- ${q}`).join("\n")}\n\n`;
}

function buildDifficultySection(hint) {
  return hint ? `\nDifficulty requested: ${hint}. Generate the question at this difficulty.\n` : "";
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

function validateQuestionShape(question) {
  if (!question || typeof question !== "object") {
    return { isValid: false, reason: "empty question payload" };
  }

  const correctAnswer = String(question.correct_answer ?? "").trim();
  if (!correctAnswer) {
    return { isValid: false, reason: "missing correct_answer" };
  }

  if (!Array.isArray(question.answers) || question.answers.length === 0) {
    return { isValid: false, reason: "missing answers array" };
  }

  const normalizedAnswers = question.answers
    .map((answer) => String(answer ?? "").trim().toLowerCase())
    .filter(Boolean);

  if (normalizedAnswers.length === 0) {
    return { isValid: false, reason: "answers are empty" };
  }

  const hasMatchingCorrectAnswer = normalizedAnswers.includes(correctAnswer.toLowerCase());
  if (!hasMatchingCorrectAnswer) {
    return { isValid: false, reason: "correct_answer not found in answers" };
  }

  return { isValid: true };
}

function parseOllamaResponse(rawResponse) {
  try {
    return JSON.parse(rawResponse);
  } catch (rawParseError) {
    const cleaned = rawResponse
      .replace(/```(\w+)?/g, "")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2019/g, "'");
    try {
      return JSON.parse(cleaned);
    } catch (cleanedParseError) {
      const parseError = new Error(
        `Failed to parse Ollama JSON. Raw parse error: ${rawParseError.message}. Cleaned parse error: ${cleanedParseError.message}`
      );
      parseError.rawResponse = rawResponse;
      parseError.cleanedResponse = cleaned;
      throw parseError;
    }
  }
}

// ==== OLLAMA COMMUNICATION ====

async function queryOllama(prompt) {
  try {
    const response = await callOllama({
      prompt,
      presetName: "populateCategories",
    });

    const responseText = getOllamaResponseText(response);
    if (!responseText) {
      throw new Error("❌ Ollama response missing parsable text payload.");
    }

    const parsed = parseOllamaResponse(responseText);
    return normalizeQuestion(parsed);

  } catch (error) {
    logOllamaErrorVerbose(error);
    return null;
  }
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

async function fetchQuestions(categoryName, difficultyHint) {
  console.log(`🔹 Generating for category: "${categoryName}" from Ollama`);

  const avoidSection = buildAvoidSection();
  const difficultySection = buildDifficultySection(difficultyHint);
  const prompt = buildQuestionPrompt(categoryName, avoidSection, difficultySection);

  const question = await queryOllama(prompt);
  return question ? [question] : [];
}

async function runPostGenerationScripts(categoryId, questionIds) {
  const disableQuestionOnValidationFailure = async (questionId, reason) => {
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
        await disableQuestionOnValidationFailure(
          questionId,
          "Disabled automatically because validation failed during populate flow."
        );
        console.log(`Validation failed for question ${questionId}. Skipping difficulty population.`);
        continue;
      }

      if (validationResult.disabled) {
        console.log(`Question ${questionId} was disabled by validation. Skipping difficulty population.`);
        continue;
      }

      await populateDifficulty(String(categoryId), String(questionId));
    } catch (error) {
      try {
        await disableQuestionOnValidationFailure(
          questionId,
          "Disabled automatically because validation errored during populate flow."
        );
      } catch (disableError) {
        console.error(
          `Failed to disable question ${questionId} after validation error:`,
          disableError.message
        );
      }
      console.error(`Post-generation pipeline failed for question ${questionId}:`, error.message);
    }
  }
}

async function populateCategory(categoryId, difficultyHint) {
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      console.error(`❌ Category not found: ${categoryId}`);
      return { addedCount: 0, duplicateQuestion: null };
    }

    const activeQuestions = category.questions.filter(q => !q.disabled).length;
    if (activeQuestions >= 100) {
      console.log(`🚫 Skipping ${category.name} (already has ${activeQuestions} questions).`);
      return { addedCount: 0, duplicateQuestion: null };
    }

    console.log(`🔹 ${category.name}: ${activeQuestions} questions. Fetching a ${difficultyHint} one.`);

    // 🧠 Step 1: Generate new question(s)
    const fetchedQuestions = await fetchQuestions(category.name, difficultyHint);
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
    await runPostGenerationScripts(category._id, addedQuestionIds);
    console.log(`✅ Added ${addedCount} question(s) to ${category.name}.`);
    return { addedCount, duplicateQuestion: null };

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
      version: 3.10
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
  await processSingleQuestion(category, newQuestion);

  console.log(`✅ Finished duplicate check within "${category.name}"`);
}


async function populateCategoryLoop(categoryId, iterations, difficultyHint) {
  let totalAdded = 0;
  let consecutiveNoAdd = 0;
  let sameDuplicateStreak = 0;
  let lastDuplicateHash = null;

  try {
    for (let i = 0; i < iterations; i++) {
      console.log(`\n🔄 Iteration ${i + 1}/${iterations} for category ${categoryId}`);
      const result = await populateCategory(categoryId, difficultyHint);
      const added = Number(result?.addedCount || 0);
      totalAdded += added;

      if (added > 0) {
        consecutiveNoAdd = 0;
        sameDuplicateStreak = 0;
        lastDuplicateHash = null;
        continue;
      }

      consecutiveNoAdd++;
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

      if (consecutiveNoAdd >= MAX_CONSECUTIVE_NO_ADD) {
        console.log(
          `🛑 Stopping early: no new question added for ${consecutiveNoAdd} consecutive iterations.`
        );
        break;
      }
    }

    return totalAdded;
  } finally {
    avoidedQuestions.length = 0;
    avoidedQuestionSet.clear();
    console.log("🧹 Cleared avoided questions list after loop.");
  }
}

module.exports = { populateCategory, populateCategoryLoop };
