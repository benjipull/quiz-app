const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");

installScriptErrorPrefix();

const connectDB = require("../config/db");
const Category = require("../models/categoryModel");
const { buildImageEligibilityPrompt } = require("./prompts/imageEligibilityPrompt");
const {
  assertOllamaSetup,
  callOllama,
  getOllamaResponseText,
} = require("../services/ollamaClient");
const { parseJsonObjectOrThrow } = require("./jsonParsingHelper");

const CURRENT_IMAGE_ELIGIBILITY_VERSION = Number(
  process.env.IMAGE_ELIGIBILITY_VERSION || 2,
);

function assertSetup() {
  assertOllamaSetup();
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

function normalizeEligibilityResult(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model response is not a JSON object");
  }

  const shouldUseImage = parseBooleanLike(parsed.should_use_image);
  if (shouldUseImage == null) {
    throw new Error("Model response missing a valid should_use_image boolean");
  }

  const reason = String(parsed.reason || "").trim();

  return {
    should_use_image: shouldUseImage,
    reason: reason || (shouldUseImage ? "Image can improve answerability." : "Image not needed."),
  };
}

async function populateImageEligibility(categoryId, questionId, options = {}) {
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

    const category = await Category.findById(categoryId).select("_id questions");
    if (!category) {
      console.error(`Category not found: ${categoryId}`);
      return false;
    }

    const questionObjectId = new mongoose.Types.ObjectId(questionId);
    const question = category.questions.find(
      (q) => q._id.equals(questionObjectId) && q.disabled !== true,
    );
    if (!question) {
      console.error(`Question not found or disabled: ${questionId}`);
      return false;
    }

    const shouldReprocessAll = Boolean(options?.reprocessAll);
    const currentVersion = Number(question?.image_eligibility?.version ?? 0);
    if (!shouldReprocessAll && Number.isFinite(currentVersion) && currentVersion >= CURRENT_IMAGE_ELIGIBILITY_VERSION) {
      const questionLabel = String(question.text || questionId).trim();
      const current = Number(options?.progress?.current);
      const total = Number(options?.progress?.total);
      const hasProgress =
        Number.isInteger(current) &&
        current > 0 &&
        Number.isInteger(total) &&
        total > 0;
      const progressPrefix = hasProgress ? `(${current}/${total}) ` : "";
      console.log(
        `${progressPrefix}Skipping image eligibility for "${questionLabel}" (version ${currentVersion} >= ${CURRENT_IMAGE_ELIGIBILITY_VERSION}).`,
      );
      return true;
    }

    const prompt = buildImageEligibilityPrompt(question);
    const response = await callOllama({
      prompt,
      presetName: "populateImageEligibility",
    });
    const rawModelResponse = getOllamaResponseText(response);
    const parsed = parseJsonObjectOrThrow(rawModelResponse, {
      normalizeOptions: {
        stripMarkdown: true,
        stripThinkTags: true,
        normalizeQuotes: true,
      },
    });
    const normalized = normalizeEligibilityResult(parsed);

    await Category.updateOne(
      { _id: categoryId, "questions._id": questionId },
      {
        $set: {
          "questions.$.image_eligibility": {
            should_use_image: normalized.should_use_image,
            reason: normalized.reason,
            version: CURRENT_IMAGE_ELIGIBILITY_VERSION,
            processed_at: new Date(),
          },
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
    console.log(
      `${progressPrefix}Updated image eligibility for "${questionLabel}" -> ${normalized.should_use_image}`,
    );
    return true;
  } catch (err) {
    console.error(`Error processing ${questionId}: ${err.message}`);
    return false;
  }
}

async function runFromCli() {
  const [, , categoryId, questionId, ...rest] = process.argv;

  if (!categoryId || !questionId) {
    console.error("Usage: node scripts/populateImageEligibility.js <categoryId> <questionId>");
    console.error("For batch mode, run: node populateAllImageEligibility.js");
    process.exit(1);
  }

  const reprocessAll = rest.includes("--all") || rest.includes("--force");

  try {
    await connectDB();
    const ok = await populateImageEligibility(categoryId, questionId, { reprocessAll });
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

module.exports = {
  CURRENT_IMAGE_ELIGIBILITY_VERSION,
  populateImageEligibility,
};
