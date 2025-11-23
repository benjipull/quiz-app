require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const axios = require("axios");
const Category = require("../models/categoryModel");

const { buildQuestionPrompt } = require("./prompts/questionPrompt");
//const { processSingleQuestion } = require("./validateDuplicateQuestions");


// ==== GLOBAL CONFIG ====
const OLLAMA_URL = process.env.OLLAMA_URL;
const avoidedQuestions = [];

if (!OLLAMA_URL) {
  console.error("❌ OLLAMA_URL is not set! Please set it in your environment variables.");
  process.exit(1);
}

console.log(`🚀 Ollama API set to: ${OLLAMA_URL}`);

// ==== HELPER FUNCTIONS ====

function generateQuestionHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function buildAvoidSection() {
  if (avoidedQuestions.length === 0) return "";
  return `Do NOT generate any of these questions (nor semantically similar ones):\n${avoidedQuestions.map(q => `- ${q}`).join("\n")}\n\n`;
}

function buildDifficultySection(hint) {
  return hint ? `\nDifficulty requested: ${hint}. Generate the question at this difficulty.\n` : "";
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

function parseOllamaResponse(rawResponse) {
  try {
    return JSON.parse(rawResponse);
  } catch {
    const cleaned = rawResponse
      .replace(/```(\w+)?/g, "")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2019/g, "'");
    return JSON.parse(cleaned);
  }
}

// ==== OLLAMA COMMUNICATION ====

async function queryOllama(prompt) {
  try {
    const res = await axios.post(
      OLLAMA_URL,
      {
        model: "llama3",
        format: "json",
        prompt,
        stream: false,
        options: {
          num_ctx: 4096,
          num_keep: 200,
          temperature: 0.2,
          top_p: 0.7,
          top_k: 5,
          min_p: 0.1,
          repeat_penalty: 1.15,
          repeat_last_n: 128,
          num_predict: 512
        }
      },
      { timeout: 240_000 }
    );

    if (!res.data || !res.data.response) {
      throw new Error("❌ Ollama response missing 'response' field.");
    }

    const parsed = parseOllamaResponse(String(res.data.response).trim());
    return normalizeQuestion(parsed);

  } catch (error) {
    logOllamaError(error);
    return null;
  }
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

// ==== MAIN FUNCTIONALITY ====

async function fetchQuestions(categoryName, difficultyHint) {
  console.log(`🔹 Generating for category: "${categoryName}" from Ollama`);

  const avoidSection = buildAvoidSection();
  const difficultySection = buildDifficultySection(difficultyHint);
  const prompt = buildQuestionPrompt(categoryName, avoidSection, difficultySection);

  const question = await queryOllama(prompt);
  return question ? [question] : [];
}

async function populateCategory(categoryId, difficultyHint) {
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      console.error(`❌ Category not found: ${categoryId}`);
      return;
    }

    const activeQuestions = category.questions.filter(q => !q.disabled).length;
    if (activeQuestions >= 100) {
      console.log(`🚫 Skipping ${category.name} (already has ${activeQuestions} questions).`);
      return;
    }

    console.log(`🔹 ${category.name}: ${activeQuestions} questions. Fetching a ${difficultyHint} one.`);

    // 🧠 Step 1: Generate new question(s)
    const fetchedQuestions = await fetchQuestions(category.name, difficultyHint);
    if (!fetchedQuestions?.length) {
      console.log("⚠️ No question returned from Ollama.");
      return;
    }

    // 🧠 Step 2: Add them to category object
    const addedCount = await addQuestionsToCategory(category, fetchedQuestions);
    if (addedCount === 0) {
      console.log("⚠️ No new question added (duplicate hash skipped).");
      return;
    }

    // 🧠 Step 3: Save the updated category to MongoDB
    category.disabled = false;
    await category.save();
    console.log(`✅ Added ${addedCount} question(s) to ${category.name}.`);

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
  }
}


async function addQuestionsToCategory(category, questions) {
  let added = 0;

  for (const q of questions) {
    const hash = generateQuestionHash(q.question);
    avoidedQuestions.push(q.question);

    if (category.questions.some(x => x.hash === hash)) {
      console.log(`⚠️ Duplicate skipped: ${q.question}`);
      continue;
    }

    category.questions.push({
      _id: new mongoose.Types.ObjectId(),
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
      version: 1.07
    });

    added++;
  }

  return added;
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
  try {
    for (let i = 0; i < iterations; i++) {
      console.log(`\n🔄 Iteration ${i + 1}/${iterations} for category ${categoryId}`);
      await populateCategory(categoryId, difficultyHint);
    }
  } finally {
    avoidedQuestions.length = 0;
    console.log("🧹 Cleared avoided questions list after loop.");
  }
}

module.exports = { populateCategory, populateCategoryLoop };
