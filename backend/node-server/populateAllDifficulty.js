const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const mongoose = require("mongoose");
const Category = require("./models/categoryModel");
const connectDB = require("./config/db");
const { populateDifficulty } = require("./scripts/populateDifficulty");

const DEFAULT_LIMIT = 1000;
const DEFAULT_DELAY_MS = 500;
const DEFAULT_PARALLEL = 1;

function printUsage() {
  console.log("Usage: node populateAllDifficulty.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --category-id=<id>    Process questions only from a specific category.");
  console.log("  --all                 Process all enabled questions.");
  console.log("  --pending-only        Process only questions missing difficulty (default).");
  console.log(`  --limit=<n>           Max questions to process (${DEFAULT_LIMIT} default, 0 = no limit).`);
  console.log(`  --delay-ms=<n>        Delay between questions in milliseconds (${DEFAULT_DELAY_MS} default).`);
  console.log(`  --parallel=<n>        Number of questions to process in parallel (${DEFAULT_PARALLEL} default).`);
  console.log("  --concurrency=<n>     Alias for --parallel.");
  console.log("  -n <n>, -p <n>        Shorthand for --parallel.");
  console.log("  --include-disabled    Include disabled questions.");
  console.log("  --help                Show this help.");
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
    includeDisabled: false,
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

    if (arg === "--include-disabled") {
      options.includeDisabled = true;
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
      if (value == null) {
        throw new Error("Missing value for --delay-ms");
      }
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
      if (value == null) {
        throw new Error(`Missing value for ${arg}`);
      }
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

  if (!options.includeDisabled) {
    match["questions.disabled"] = { $ne: true };
  }

  if (!options.processAll) {
    match.$or = [
      { "questions.difficultyConfirmedVersion": { $exists: false } },
      { "questions.difficultyConfirmedVersion": 0 },
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

async function batchPopulateDifficulty(options) {
  await connectDB();

  const mode = options.processAll ? "all questions" : "pending-only questions";
  const scope = options.includeDisabled ? "including disabled" : "excluding disabled";
  const categoryLabel = options.categoryId ? options.categoryId : "all categories";
  const limitLabel = options.limit > 0 ? String(options.limit) : "none";
  console.log(
    `Running difficulty population in ${mode} mode (${scope}, category=${categoryLabel}, limit=${limitLabel}, delay=${options.delayMs}ms, parallel=${options.parallel}).`
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
  for (let i = 0; i < indexedQuestions.length; i += options.parallel) {
    const batch = indexedQuestions.slice(i, i + options.parallel);
    const results = await Promise.allSettled(
      batch.map(async ({ q, index }) => {
        const snippet = (q.text || "").substring(0, 80);
        console.log(`(${index + 1}/${questions.length}) ${snippet}...`);
        return populateDifficulty(q.categoryId, q.questionId);
      })
    );

    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value === true) {
        success += 1;
        return;
      }

      if (result.status === "rejected") {
        console.error(`Unhandled question processing error: ${result.reason?.message || result.reason}`);
      }

      fail += 1;
    });

    if (options.delayMs > 0 && i + options.parallel < indexedQuestions.length) {
      await sleep(options.delayMs);
    }
  }

  console.log("");
  console.log("Finished processing difficulty levels.");
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
    await batchPopulateDifficulty(options);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(`Error in batchPopulateDifficulty: ${err.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

main();
