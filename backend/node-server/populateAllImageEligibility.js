const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { installScriptErrorPrefix } = require("./scripts/errorLogger");
installScriptErrorPrefix();

const mongoose = require("mongoose");

const connectDB = require("./config/db");
const Category = require("./models/categoryModel");
const {
  CURRENT_IMAGE_ELIGIBILITY_VERSION,
  populateImageEligibility,
} = require("./scripts/populateImageEligibility");
const { runWithConcurrencyPool } = require("./scripts/concurrencyPool");
const {
  parseNonNegativeIntOrThrow,
  parseMinOneIntOrThrow,
} = require("./utils/numberUtils");

const DEFAULT_LIMIT = 10000;
const DEFAULT_DELAY_MS = 0;
const DEFAULT_PARALLEL = 10;

function printUsage() {
  console.log("Usage: node populateAllImageEligibility.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --all, --force        Reprocess all questions regardless of saved version.");
  console.log("  --pending-only        Process only questions below current version (default).");
  console.log(
    "  --reprocess-eligible-true  Include questions already marked should_use_image=true.",
  );
  console.log("  --category-id=<id>    Process questions only from a specific category.");
  console.log(
    `  --limit=<n>           Max questions to process (${DEFAULT_LIMIT} default, 0 = no limit).`,
  );
  console.log(
    `  --delay-ms=<n>        Delay after each processed question in milliseconds (${DEFAULT_DELAY_MS} default).`,
  );
  console.log(
    `  --parallel=<n>        Number of questions to process in parallel (${DEFAULT_PARALLEL} default).`,
  );
  console.log("  --concurrency=<n>     Alias for --parallel.");
  console.log("  -n <n>, -p <n>        Shorthand for --parallel.");
  console.log("  --help                Show this help.");
  console.log("");
  console.log(
    `Current version in code: ${CURRENT_IMAGE_ELIGIBILITY_VERSION} (bump this to force reprocessing).`,
  );
}


function parseArgs(args) {
  const options = {
    processAll: false,
    reprocessEligibleTrue: false,
    limit: DEFAULT_LIMIT,
    delayMs: DEFAULT_DELAY_MS,
    parallel: DEFAULT_PARALLEL,
    categoryId: null,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--all" || arg === "--force") {
      options.processAll = true;
      continue;
    }

    if (arg === "--pending-only") {
      options.processAll = false;
      continue;
    }

    if (arg === "--reprocess-eligible-true") {
      options.reprocessEligibleTrue = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--limit") {
      const value = args[i + 1];
      if (value == null) {
        throw new Error("Missing value for --limit");
      }
      options.limit = parseNonNegativeIntOrThrow(value, "limit");
      i += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = parseNonNegativeIntOrThrow(arg.split("=")[1], "limit");
      continue;
    }

    if (arg === "--delay-ms") {
      const value = args[i + 1];
      if (value == null) {
        throw new Error("Missing value for --delay-ms");
      }
      options.delayMs = parseNonNegativeIntOrThrow(value, "delay-ms");
      i += 1;
      continue;
    }

    if (arg.startsWith("--delay-ms=")) {
      options.delayMs = parseNonNegativeIntOrThrow(arg.split("=")[1], "delay-ms");
      continue;
    }

    if (
      arg === "--parallel" ||
      arg === "--concurrency" ||
      arg === "-n" ||
      arg === "-p"
    ) {
      const value = args[i + 1];
      if (value == null) {
        throw new Error(`Missing value for ${arg}`);
      }
      options.parallel = parseMinOneIntOrThrow(value, "parallel");
      i += 1;
      continue;
    }

    if (arg.startsWith("--parallel=")) {
      options.parallel = parseMinOneIntOrThrow(arg.split("=")[1], "parallel");
      continue;
    }

    if (arg.startsWith("--concurrency=")) {
      options.parallel = parseMinOneIntOrThrow(arg.split("=")[1], "parallel");
      continue;
    }

    if (arg.startsWith("-n=")) {
      options.parallel = parseMinOneIntOrThrow(arg.split("=")[1], "parallel");
      continue;
    }

    if (arg.startsWith("-p=")) {
      options.parallel = parseMinOneIntOrThrow(arg.split("=")[1], "parallel");
      continue;
    }

    if (arg === "--category-id") {
      const value = args[i + 1];
      if (value == null) {
        throw new Error("Missing value for --category-id");
      }
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
  const match = {};

  if (options.categoryId) {
    match._id = new mongoose.Types.ObjectId(options.categoryId);
  }

  // Only process enabled questions.
  match["questions.disabled"] = { $ne: true };
  if (!options.reprocessEligibleTrue) {
    match["questions.image_eligibility.should_use_image"] = { $ne: true };
  }

  if (!options.processAll) {
    match.$or = [
      { "questions.image_eligibility": { $exists: false } },
      { "questions.image_eligibility.version": { $exists: false } },
      { "questions.image_eligibility.version": null },
      { "questions.image_eligibility.version": { $lt: CURRENT_IMAGE_ELIGIBILITY_VERSION } },
    ];
  }

  const pipeline = [
    { $unwind: "$questions" },
    { $match: match },
    {
      $project: {
        categoryId: "$_id",
        questionId: "$questions._id",
        text: "$questions.text",
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

async function batchPopulateImageEligibility(options) {
  await connectDB();

  const mode = options.processAll ? "all questions" : "pending-only questions";
  const categoryLabel = options.categoryId ? options.categoryId : "all categories";
  const limitLabel = options.limit > 0 ? String(options.limit) : "none";
  const eligibleTrueLabel = options.reprocessEligibleTrue ? "included" : "skipped";
  console.log(
    `Running image eligibility in ${mode} mode (category=${categoryLabel}, eligibleTrue=${eligibleTrueLabel}, limit=${limitLabel}, delay=${options.delayMs}ms, parallel=${options.parallel}, version=${CURRENT_IMAGE_ELIGIBILITY_VERSION}).`,
  );

  const questions = await Category.aggregate(buildPipeline(options));

  if (questions.length === 0) {
    console.log("No matching questions found.");
    return;
  }

  console.log(`Found ${questions.length} question(s) to process.`);

  let success = 0;
  let fail = 0;

  const indexedQuestions = questions.map((q, index) => ({ q, index }));
  const results = await runWithConcurrencyPool(
    indexedQuestions,
    options.parallel,
    async ({ q, index }) => {
      try {
        return await populateImageEligibility(q.categoryId, q.questionId, {
          reprocessAll: options.processAll,
          progress: {
            current: index + 1,
            total: questions.length,
          },
        });
      } finally {
        if (options.delayMs > 0) {
          await sleep(options.delayMs);
        }
      }
    },
  );

  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value === true) {
      success += 1;
      return;
    }

    if (result.status === "rejected") {
      console.error(
        `Unhandled image eligibility error: ${result.reason?.message || result.reason}`,
      );
    }
    fail += 1;
  });

  console.log("");
  console.log("Finished processing image eligibility.");
  console.log(`Successful: ${success}`);
  console.log(`Failed: ${fail}`);
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
    await batchPopulateImageEligibility(options);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(`Error in batchPopulateImageEligibility: ${err.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

main();
