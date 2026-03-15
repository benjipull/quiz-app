const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const axios = require("axios");

const connectDB = require("../config/db");
const Category = require("../models/categoryModel");

const OLLAMA_URL = process.env.OLLAMA_URL;
const DIFFICULTY_VERSION = 0.01;

function assertSetup() {
  if (!OLLAMA_URL) {
    throw new Error("Missing OLLAMA_URL in backend/node-server/.env");
  }
}

function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

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

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function parseModelJson(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/```(\w+)?/g, "")
    .replace(/\u201C|\u201D/g, "\"")
    .replace(/\u2018|\u2019/g, "'");

  try {
    return JSON.parse(cleaned);
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (!extracted) {
      throw new Error("No JSON object found in model response");
    }
    return JSON.parse(extracted);
  }
}

function salvageDifficultyFromMalformedJson(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/```(\w+)?/g, "")
    .replace(/\u201C|\u201D/g, "\"")
    .replace(/\u2018|\u2019/g, "'");

  const levelMatch = cleaned.match(/["']?difficulty_level["']?\s*:\s*(-?\d+(?:\.\d+)?)/i);
  if (!levelMatch) {
    return null;
  }

  const parsedLevel = Number(levelMatch[1]);
  if (!Number.isFinite(parsedLevel)) {
    return null;
  }

  let rationale = "";
  const fullRationaleMatch = cleaned.match(/["']?difficulty_rationale["']?\s*:\s*"([^"]*)"/i);
  if (fullRationaleMatch && fullRationaleMatch[1]) {
    rationale = fullRationaleMatch[1].trim();
  } else {
    const partialRationaleMatch = cleaned.match(/["']?difficulty_rationale["']?\s*:\s*"([\s\S]*)$/i);
    if (partialRationaleMatch && partialRationaleMatch[1]) {
      rationale = partialRationaleMatch[1]
        .replace(/[\r\n]+/g, " ")
        .replace(/[}\],\s]+$/g, "")
        .trim();
    }
  }

  if (!rationale) {
    rationale = "Recovered from malformed model response.";
  }

  return {
    difficulty_level: parsedLevel,
    difficulty_rationale: rationale,
  };
}

async function populateDifficulty(categoryId, questionId) {
  try {
    assertSetup();

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.error(`Invalid categoryId: ${categoryId}`);
      return false;
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      console.error(`Invalid questionId: ${questionId}`);
      return false;
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      console.error(`Category not found: ${categoryId}`);
      return false;
    }

    const questionObjectId = new mongoose.Types.ObjectId(questionId);
    const question = category.questions.find(
      (q) => q._id.equals(questionObjectId) && q.disabled !== true
    );

    if (!question) {
      console.error(`Question not found or disabled: ${questionId}`);
      const sampleIds = category.questions.slice(0, 5).map((q) => q._id.toString());
      console.log("Sample question IDs in this category:", sampleIds, "...");
      return false;
    }

    const prompt = `
You are an assistant that classifies trivia questions into difficulty levels.

RUBRIC for "difficulty_level" (integer 1-10):
1-2 Very Easy: universally known, primary-school facts.
3-4 Easy: commonly taught basics.
5-6 Moderate: regional specifics, niche-but-accessible details.
7-8 Hard: specialized knowledge, advanced concepts, enthusiast-level facts.
9-10 Very Hard: highly obscure, expert/scholarly facts.

Additional guidance:
- Consider how widely known the fact is, not just its length or wording.
- If the answer requires academic study or field expertise, score higher.
- If the answer is guessable by most adults, score lower.
- Use the explanation to infer whether uncommon context is required.

Now classify the following trivia question:

Question: ${question.text}
Answers: ${question.answers.map((a) => a.text).join(", ")}
Correct Answer: ${question.correct_answer}
Explanation: ${question.explanation || "N/A"}

Respond in strict JSON:
{
  "difficulty_level": <integer 1-10>,
  "difficulty_rationale": "<string explaining reasoning>"
}`.trim();

    const response = await axios.post(
      OLLAMA_URL,
      {
        model: "qwen3:8b",
        format: "json",
        prompt,
        stream: false,
        options: {
          num_ctx: 2048,
          num_keep: 100,
          temperature: 0.0,
          top_p: 0.9,
          top_k: 30,
          repeat_penalty: 1.1,
          repeat_last_n: 32,
          num_predict: 120,
        },
      },
      { timeout: 180000 }
    );

    let parsed;
    const rawModelResponse = String(response?.data?.response || "").trim();
    try {
      parsed = parseModelJson(rawModelResponse);
    } catch {
      const salvaged = salvageDifficultyFromMalformedJson(rawModelResponse);
      if (!salvaged) {
        console.error(`Failed to parse JSON for ${questionId}: ${rawModelResponse}`);
        return false;
      }

      parsed = salvaged;
      console.warn(`Recovered malformed JSON for ${questionId}; applying salvaged difficulty.`);
    }

    if (typeof parsed.difficulty_level !== "number" || Number.isNaN(parsed.difficulty_level)) {
      console.error(`Invalid model response for ${questionId}`);
      return false;
    }

    const difficultyLevel = Math.max(1, Math.min(10, Math.round(parsed.difficulty_level)));
    const difficultyRationale = String(parsed.difficulty_rationale || "Recovered from malformed model response.").trim();

    await Category.updateOne(
      { _id: categoryId, "questions._id": questionId },
      {
        $set: {
          "questions.$.difficulty_level": difficultyLevel,
          "questions.$.difficulty_rationale": difficultyRationale,
          "questions.$.difficultyConfirmedVersion": DIFFICULTY_VERSION,
        },
      }
    );

    console.log(`Updated question ${questionId} -> level ${difficultyLevel}`);
    return true;
  } catch (err) {
    console.error(`Error processing ${questionId}: ${err.message}`);
    return false;
  }
}

async function runFromCli() {
  const [, , categoryId, questionId] = process.argv;

  if (!categoryId || !questionId) {
    console.error("Usage: node scripts/populateDifficulty.js <categoryId> <questionId>");
    console.error("For batch mode, run: node populateAllDifficulty.js");
    process.exit(1);
  }

  try {
    await connectDB();
    const ok = await populateDifficulty(categoryId, questionId);
    await mongoose.connection.close();
    process.exit(ok ? 0 : 1);
  } catch (err) {
    console.error(`Fatal error: ${err.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  runFromCli();
}

module.exports = { populateDifficulty };
