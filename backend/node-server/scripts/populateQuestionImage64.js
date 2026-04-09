const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");

installScriptErrorPrefix();
const connectDB = require("../config/db");
const Category = require("../models/categoryModel");
const {
  assertImageSetup,
  generateQuestionImageBase64,
} = require("../services/imageClient");
const { optimizeBase64Image } = require("../utils/optimizeBase64Image");
const { runWithConcurrencyPool } = require("./concurrencyPool");

const QUESTION_IMAGE_VERSION = Number(process.env.QUESTION_IMAGE64_VERSION || 1);
const DEFAULT_LIMIT = 1000;
const DEFAULT_DELAY_MS = Number(
  process.env.QUESTION_IMAGE64_REQUEST_DELAY_MS || process.env.IMAGE64_REQUEST_DELAY_MS || 300,
);
const DEFAULT_PARALLEL = 1;
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

function buildPendingImageConditions(pathPrefix = "questions.") {
  return [
    { [`${pathPrefix}image64`]: { $exists: false } },
    { [`${pathPrefix}image64`]: null },
    { [`${pathPrefix}image64`]: "" },
    { [`${pathPrefix}image_version`]: { $exists: false } },
    { [`${pathPrefix}image_version`]: null },
    { [`${pathPrefix}image_version`]: { $lt: QUESTION_IMAGE_VERSION } },
  ];
}

function buildEligibleQuestionWriteMatch(questionId, processAll) {
  const questionMatch = {
    _id: questionId,
    disabled: { $ne: true },
    "image_eligibility.should_use_image": true,
  };

  if (!processAll) {
    questionMatch.$or = buildPendingImageConditions("");
  }

  return questionMatch;
}

function printUsage() {
  console.log("Usage: node scripts/populateQuestionImage64.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --all                 Reprocess all eligible questions.");
  console.log("  --pending-only        Process only eligible questions missing current image version (default).");
  console.log("  --category-id=<id>    Process questions only from one category.");
  console.log(`  --limit=<n>           Max questions to process (${DEFAULT_LIMIT} default, 0 = no limit).`);
  console.log(`  --delay-ms=<n>        Delay after each processed question in milliseconds (${DEFAULT_DELAY_MS} default).`);
  console.log(`  --parallel=<n>        Number of questions to process in parallel (${DEFAULT_PARALLEL} default).`);
  console.log("  --concurrency=<n>     Alias for --parallel.");
  console.log("  -n <n>, -p <n>        Shorthand for --parallel.");
  console.log("  --help                Show this help.");
  console.log("");
  console.log(
    `Current question image version in code: ${QUESTION_IMAGE_VERSION} (bump this to force reprocessing).`,
  );
}

function parsePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return num;
}

function parseMinOneInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return num;
}

function parseArgs(args) {
  const options = {
    processAll: false,
    limit: DEFAULT_LIMIT,
    delayMs: DEFAULT_DELAY_MS,
    parallel: DEFAULT_PARALLEL,
    categoryId: null,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--all") {
      options.processAll = true;
      continue;
    }

    if (arg === "--pending-only") {
      options.processAll = false;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--limit") {
      const value = args[i + 1];
      if (value == null) throw new Error("Missing value for --limit");
      options.limit = parsePositiveInt(value, "limit");
      i += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInt(arg.split("=")[1], "limit");
      continue;
    }

    if (arg === "--delay-ms") {
      const value = args[i + 1];
      if (value == null) throw new Error("Missing value for --delay-ms");
      options.delayMs = parsePositiveInt(value, "delay-ms");
      i += 1;
      continue;
    }

    if (arg.startsWith("--delay-ms=")) {
      options.delayMs = parsePositiveInt(arg.split("=")[1], "delay-ms");
      continue;
    }

    if (
      arg === "--parallel" ||
      arg === "--concurrency" ||
      arg === "-n" ||
      arg === "-p"
    ) {
      const value = args[i + 1];
      if (value == null) throw new Error(`Missing value for ${arg}`);
      options.parallel = parseMinOneInt(value, "parallel");
      i += 1;
      continue;
    }

    if (arg.startsWith("--parallel=")) {
      options.parallel = parseMinOneInt(arg.split("=")[1], "parallel");
      continue;
    }

    if (arg.startsWith("--concurrency=")) {
      options.parallel = parseMinOneInt(arg.split("=")[1], "parallel");
      continue;
    }

    if (arg.startsWith("-n=")) {
      options.parallel = parseMinOneInt(arg.split("=")[1], "parallel");
      continue;
    }

    if (arg.startsWith("-p=")) {
      options.parallel = parseMinOneInt(arg.split("=")[1], "parallel");
      continue;
    }

    if (arg === "--category-id") {
      const value = args[i + 1];
      if (value == null) throw new Error("Missing value for --category-id");
      if (!mongoose.isValidObjectId(value)) {
        throw new Error(`Invalid category-id: ${value || "<empty>"}`);
      }
      options.categoryId = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--category-id=")) {
      const categoryId = arg.split("=")[1];
      if (!categoryId || !mongoose.isValidObjectId(categoryId)) {
        throw new Error(`Invalid category-id: ${categoryId || "<empty>"}`);
      }
      options.categoryId = categoryId;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function buildPipeline(options) {
  const match = {
    "questions.disabled": { $ne: true },
    "questions.image_eligibility.should_use_image": true,
  };

  if (options.categoryId) {
    match._id = new mongoose.Types.ObjectId(options.categoryId);
  }

  if (!options.processAll) {
    match.$or = buildPendingImageConditions();
  }

  const pipeline = [
    { $unwind: "$questions" },
    { $match: match },
    {
      $project: {
        categoryId: "$_id",
        categoryName: "$name",
        questionId: "$questions._id",
        questionText: "$questions.text",
        correctAnswer: "$questions.correct_answer",
        explanation: "$questions.explanation",
      },
    },
  ];

  if (options.limit > 0) {
    pipeline.push({ $limit: options.limit });
  }

  return pipeline;
}

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPreviewString(value, maxChars = ERROR_OUTPUT_PREVIEW_MAX_CHARS) {
  if (value == null) return "";

  let rendered = "";
  if (typeof value === "string") {
    rendered = value;
  } else {
    try {
      rendered = JSON.stringify(value, null, 2);
    } catch (error) {
      rendered = String(value);
    }
  }

  if (rendered.length <= maxChars) {
    return rendered;
  }

  return `${rendered.slice(0, maxChars)}\n... [truncated ${rendered.length - maxChars} chars]`;
}

async function populateQuestionImage(item, progress, options = {}) {
  const question = {
    text: item.questionText,
    correct_answer: item.correctAnswer,
    explanation: item.explanation,
  };

  const label = `${progress.current}/${progress.total} (${item.categoryName})`;

  try {
    const { base64, prompt } = await generateQuestionImageBase64(question, item.categoryName);
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
        console.warn(`Image optimization skipped for ${label}: ${optimizeError.message}`);
      }
    }

    const updateResult = await Category.updateOne(
      {
        _id: item.categoryId,
        questions: {
          $elemMatch: buildEligibleQuestionWriteMatch(
            item.questionId,
            options.processAll,
          ),
        },
      },
      {
        $set: {
          "questions.$.image64": image64ToSave,
          "questions.$.image_prompt": prompt || "",
          "questions.$.image_version": QUESTION_IMAGE_VERSION,
          "questions.$.image_generated_at": new Date(),
        },
      },
    );

    if (!updateResult.modifiedCount) {
      console.log(`Skipped ${label}: no longer eligible or already up-to-date.`);
      return "skipped";
    }

    console.log(`Saved question image for ${label}.`);
    return "updated";
  } catch (error) {
    console.error(`Failed ${label}: ${error.message}`);
    const apiOutputPreview = toPreviewString(error?.apiOutput);
    if (apiOutputPreview) {
      console.error(`Image API output for ${label}:\n${apiOutputPreview}`);
    }
    return "failed";
  }
}

async function populateQuestionImage64(options = {}) {
  const questions = await Category.aggregate(buildPipeline(options));
  if (!questions.length) {
    console.log("No enabled, image-eligible questions found to process.");
    return;
  }

  const mode = options.processAll ? "all eligible questions" : "pending eligible questions";
  const categoryLabel = options.categoryId ? options.categoryId : "all categories";
  const limitLabel = options.limit > 0 ? String(options.limit) : "none";
  console.log(
    `Processing ${mode} (category=${categoryLabel}, limit=${limitLabel}, delay=${options.delayMs}ms, parallel=${options.parallel}, version=${QUESTION_IMAGE_VERSION}).`,
  );
  console.log(`Found ${questions.length} question(s) to process.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const indexedQuestions = questions.map((q, index) => ({ q, index }));
  const results = await runWithConcurrencyPool(
    indexedQuestions,
    options.parallel,
    async ({ q, index }) => {
      try {
        return await populateQuestionImage(q, {
          current: index + 1,
          total: questions.length,
        }, options);
      } finally {
        if (options.delayMs > 0) {
          await sleep(options.delayMs);
        }
      }
    },
  );

  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value === "updated") {
      updated += 1;
      return;
    }
    if (result.status === "fulfilled" && result.value === "skipped") {
      skipped += 1;
      return;
    }
    failed += 1;
  });

  console.log("");
  console.log("Question image64 population complete.");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    printUsage();
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  try {
    assertImageSetup();
    await connectDB();
    await populateQuestionImage64(options);
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
  populateQuestionImage64,
};
