const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Category = require("../models/categoryModel");
const {
  assertOllamaSetup,
  callOllama,
  getOllamaResponseText,
} = require("../services/ollamaClient");

const DIFFICULTY_VERSION = 0.01;

function assertSetup() {
  assertOllamaSetup();
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
You are an assistant that classifies trivia questions into a single difficulty level from 1 to 10.

=== RULE ===
Select EXACTLY ONE integer from 1–10.

=== CRITICAL INSTRUCTION ===
Do NOT default to 5.
Level 5 should be used ONLY if the question is truly balanced between common and niche knowledge.
If unsure, choose the closest NON-5 level.

=== DIFFICULTY SCALE ===
1 — Extremely common knowledge (known by nearly everyone worldwide)
2 — Very common knowledge
3 — Common knowledge
4 — Familiar but not universal
5 — Balanced midpoint (use rarely)
6 — Somewhat niche
7 — Niche knowledge
8 — Specialist knowledge
9 — Expert knowledge
10 — Highly obscure

=== DECISION PROCESS (MANDATORY) ===
1. Ask: “Would most adults know this?”
   - Yes → choose 1–4
2. Else ask: “Would only interested or knowledgeable people know this?”
   - Yes → choose 6–7
3. Else ask: “Does this require expertise or deep study?”
   - Yes → choose 8–10
4. Use 5 ONLY if it clearly fits none of the above.

=== PRINCIPLES ===
- Judge the FACT, not the wording.
- If guessable → lower score.
- If requires recall or exposure → mid-high.
- If requires study → high.

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

    const response = await callOllama({
      prompt,
      presetName: "populateDifficulty",
    });

    let parsed;
    const rawModelResponse = getOllamaResponseText(response);
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
