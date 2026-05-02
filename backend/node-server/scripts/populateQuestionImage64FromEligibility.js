const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");
installScriptErrorPrefix();

const connectDB = require("../config/db");
const Category = require("../models/categoryModel");
const {
  assertImageSetup,
  generateImageBase64FromPrompt,
} = require("../services/imageClient");
const { optimizeBase64Image } = require("../utils/optimizeBase64Image");
const {
  buildQuestionImage64Prompt,
} = require("./prompts/questionImage64Prompt");
const { sleep } = require("../utils/asyncUtils");
const { toPreviewString } = require("../utils/logUtils");
const {
  buildPendingImageConditions,
  buildEligibleQuestionWriteMatch,
} = require("./questionImage64Helpers");

const QUESTION_IMAGE_VERSION = Number(process.env.QUESTION_IMAGE64_VERSION || 1);
const REQUEST_DELAY_MS = Number(
  process.env.QUESTION_IMAGE64_REQUEST_DELAY_MS || process.env.IMAGE64_REQUEST_DELAY_MS || 300,
);
const ERROR_OUTPUT_PREVIEW_MAX_CHARS = Number(
  process.env.QUESTION_IMAGE64_ERROR_OUTPUT_PREVIEW_MAX_CHARS ||
    process.env.IMAGE64_ERROR_OUTPUT_PREVIEW_MAX_CHARS ||
    6000,
);
const OPTIMIZE_BEFORE_SAVE = String(
  process.env.QUESTION_IMAGE64_OPTIMIZE_BEFORE_SAVE ||
    process.env.IMAGE64_OPTIMIZE_BEFORE_SAVE ||
    "true",
).toLowerCase() !== "false";
const INCLUDE_EXISTING_BY_DEFAULT = String(
  process.env.QUESTION_IMAGE64_INCLUDE_EXISTING || "false",
).toLowerCase() === "true";

function printUsage() {
  console.log("Usage: node scripts/populateQuestionImage64FromEligibility.js [--all] [--help]");
  console.log("");
  console.log("Options:");
  console.log("  --all, --force   Reprocess all image-eligible questions.");
  console.log("  --help, -h       Show this help.");
}

function parseArgs(argv) {
  const includeExistingImages = argv.includes("--all") || argv.includes("--force");
  const help = argv.includes("--help") || argv.includes("-h");

  const unsupported = argv.filter(
    (arg) => !["--all", "--force", "--help", "-h"].includes(arg),
  );
  if (unsupported.length) {
    throw new Error(`Unknown option(s): ${unsupported.join(", ")}`);
  }

  return {
    includeExistingImages,
    help,
  };
}

function buildPipeline(includeExistingImages) {
  const match = {
    "questions.disabled": { $ne: true },
    "questions.image_eligibility.should_use_image": true,
  };

  if (!includeExistingImages) {
    match.$or = buildPendingImageConditions(QUESTION_IMAGE_VERSION);
  }

  return [
    { $unwind: "$questions" },
    { $match: match },
    {
      $project: {
        categoryId: "$_id",
        categoryName: "$name",
        questionId: "$questions._id",
        questionText: "$questions.text",
        correctAnswer: "$questions.correct_answer",
      },
    },
  ];
}

async function populateQuestionImage64FromEligibility(options = {}) {
  const includeExistingImages = Boolean(options.includeExistingImages);
  const rows = await Category.aggregate(buildPipeline(includeExistingImages));

  if (!rows.length) {
    console.log(
      includeExistingImages
        ? "No image-eligible questions found."
        : "No image-eligible questions with empty/outdated image64 found.",
    );
    return;
  }

  if (includeExistingImages) {
    console.log(
      `Found ${rows.length} image-eligible questions. Regenerating image64 for all (--all mode).`,
    );
  } else {
    console.log(`Found ${rows.length} image-eligible questions needing image64.`);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const label = `${index + 1}/${rows.length} (${row.categoryName})`;

    try {
      const question = {
        text: row.questionText,
        correct_answer: row.correctAnswer,
      };
      const prompt = buildQuestionImage64Prompt(question, row.categoryName);
      console.log(`Generating image for ${label}...`);
      const { base64 } = await generateImageBase64FromPrompt(prompt);
      let image64ToSave = base64;

      if (OPTIMIZE_BEFORE_SAVE) {
        try {
          const optimized = await optimizeBase64Image(base64);
          image64ToSave = optimized.dataUri;
          const optimizationVerb = optimized.wasOptimized ? "Reduced" : "Kept";
          console.log(
            `${optimizationVerb} ${label}: ${optimized.bytesOriginal}B -> ${optimized.bytesFinal}B (${optimized.reductionPercent}% reduction, ${optimized.mimeType})`,
          );
        } catch (optimizeError) {
          console.warn(
            `Image optimization skipped for ${label}: ${optimizeError.message}`,
          );
        }
      }

      const updateResult = await Category.updateOne(
        {
          _id: row.categoryId,
          questions: {
            $elemMatch: buildEligibleQuestionWriteMatch(
              row.questionId,
              includeExistingImages,
              QUESTION_IMAGE_VERSION,
            ),
          },
        },
        {
          $set: {
            "questions.$.image64": image64ToSave,
            "questions.$.image_prompt": prompt,
            "questions.$.image_version": QUESTION_IMAGE_VERSION,
            "questions.$.image_generated_at": new Date(),
          },
        },
      );

      if (!updateResult.modifiedCount) {
        skipped += 1;
        console.log(`Skipped ${label}: no longer eligible or already up-to-date.`);
        continue;
      }

      updated += 1;
      console.log(`Saved question image64 for ${label}.`);
    } catch (error) {
      failed += 1;
      console.error(`Failed ${label}: ${error.message}`);
      const apiOutputPreview = toPreviewString(
        error?.apiOutput,
        ERROR_OUTPUT_PREVIEW_MAX_CHARS,
      );
      if (apiOutputPreview) {
        console.error(`Image API output for ${label}:\n${apiOutputPreview}`);
      }
    }

    if (REQUEST_DELAY_MS > 0 && index + 1 < rows.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log("");
  console.log("Question image64 population (image_eligibility=true) complete.");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printUsage();
      process.exit(0);
    }

    const includeExistingImages = args.includeExistingImages || INCLUDE_EXISTING_BY_DEFAULT;

    assertImageSetup();
    await connectDB();
    await populateQuestionImage64FromEligibility({ includeExistingImages });
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  QUESTION_IMAGE_VERSION,
  populateQuestionImage64FromEligibility,
};
