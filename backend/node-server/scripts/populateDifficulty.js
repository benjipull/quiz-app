const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");

installScriptErrorPrefix();

const connectDB = require("../config/db");
const Category = require("../models/categoryModel");
const {
  assertOllamaSetup,
  callOllama,
  getOllamaResponseText,
} = require("../services/ollamaClient");
const {
  normalizeJsonText,
  parseJsonObjectOrThrow,
} = require("./jsonParsingHelper");
const { buildPopulateDifficultyPrompt } = require("./prompts/populateDifficultyPrompt");

const DIFFICULTY_VERSION = 0.02;

function assertSetup() {
  assertOllamaSetup();
}

function salvageDifficultyFromMalformedJson(raw) {
  const cleaned = normalizeJsonText(raw, {
    stripMarkdown: true,
    normalizeQuotes: true,
  });

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

function hasPopulatedImage64(image64) {
  const normalized = String(image64 ?? "").trim();
  return Boolean(
    normalized &&
      normalized.toLowerCase() !== "null" &&
      normalized.toLowerCase() !== "undefined",
  );
}

async function populateDifficulty(categoryId, questionId, options = {}) {
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
      (item) => item._id.equals(questionObjectId) && item.disabled !== true,
    );

    if (!question) {
      console.error(`Question not found or disabled: ${questionId}`);
      const sampleIds = category.questions.slice(0, 5).map((item) => item._id.toString());
      console.log("Sample question IDs in this category:", sampleIds, "...");
      return false;
    }

    const prompt = buildPopulateDifficultyPrompt(question);
    const response = await callOllama({
      prompt,
      presetName: "populateDifficulty",
    });

    let parsed;
    const rawModelResponse = getOllamaResponseText(response);
    try {
      parsed = parseJsonObjectOrThrow(rawModelResponse, {
        normalizeOptions: {
          stripMarkdown: true,
          stripThinkTags: true,
          normalizeQuotes: true,
        },
      });
    } catch {
      const salvaged = salvageDifficultyFromMalformedJson(rawModelResponse);
      if (!salvaged) {
        console.error(`Failed to parse JSON for ${questionId}: ${rawModelResponse}`);
        return false;
      }

      parsed = salvaged;
    }

    if (typeof parsed.difficulty_level !== "number" || Number.isNaN(parsed.difficulty_level)) {
      console.error(`Invalid model response for ${questionId}`);
      return false;
    }

    const aiDifficultyLevel = Math.max(1, Math.min(10, Math.round(parsed.difficulty_level)));
    const detectedImage64 = hasPopulatedImage64(question.image64);
    const shouldReduceForImage =
      options.forceHasImage64 === true || detectedImage64;
    const difficultyLevel = shouldReduceForImage
      ? Math.max(1, aiDifficultyLevel - 1)
      : aiDifficultyLevel;
    const difficultyRationale = String(
      parsed.difficulty_rationale || "Recovered from malformed model response.",
    ).trim();

    await Category.updateOne(
      { _id: categoryId, "questions._id": questionId },
      {
        $set: {
          "questions.$.difficulty_level": difficultyLevel,
          "questions.$.difficulty_rationale": difficultyRationale,
          "questions.$.difficultyConfirmedVersion": DIFFICULTY_VERSION,
        },
      },
    );

    const questionLabel = String(question.text || questionId).trim();
    const current = Number(options?.progress?.current);
    const total = Number(options?.progress?.total);
    const hasProgress =
      Number.isInteger(current) &&
      current > 0 &&
      Number.isInteger(total) &&
      total > 0;
    const progressPrefix = hasProgress ? `(${current}/${total}) ` : "";
    const reduction = Math.max(0, aiDifficultyLevel - difficultyLevel);
    console.log(
      `${progressPrefix}Updated question "${questionLabel}" -> level ${difficultyLevel} (AI=${aiDifficultyLevel}, reduction=${reduction}, image64=${shouldReduceForImage ? "yes" : "no"})`,
    );
    return true;
  } catch (error) {
    console.error(`Error processing ${questionId}: ${error.message}`);
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
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
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
