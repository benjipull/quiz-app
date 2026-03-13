const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const mongoose = require("mongoose");
const Category = require("./models/categoryModel");
const connectDB = require("./config/db");
const { populateDifficulty } = require("./scripts/populateDifficulty");

const DEFAULT_LIMIT = 1000;
const DEFAULT_DELAY_MS = 500;

function printUsage() {
  console.log("Usage: node populateAllDifficulty.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --all                 Process all enabled questions.");
  console.log("  --pending-only        Process only questions missing difficulty (default).");
  console.log(`  --limit=<n>           Max questions to process (${DEFAULT_LIMIT} default, 0 = no limit).`);
  console.log(`  --delay-ms=<n>        Delay between questions in milliseconds (${DEFAULT_DELAY_MS} default).`);
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

function parseArgs(args) {
  const options = {
    processAll: false,
    includeDisabled: false,
    limit: DEFAULT_LIMIT,
    delayMs: DEFAULT_DELAY_MS,
    help: false,
  };

  for (const arg of args) {
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

    if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInt(arg.split("=")[1], "limit");
      continue;
    }

    if (arg.startsWith("--delay-ms=")) {
      options.delayMs = parsePositiveInt(arg.split("=")[1], "delay-ms");
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function buildPipeline(options) {
  const match = {};

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
  const limitLabel = options.limit > 0 ? String(options.limit) : "none";
  console.log(`Running difficulty population in ${mode} mode (${scope}, limit=${limitLabel}, delay=${options.delayMs}ms).`);

  const questions = await Category.aggregate(buildPipeline(options));

  if (questions.length === 0) {
    console.log("No matching questions found.");
    return;
  }

  console.log(`Found ${questions.length} question(s) to process.`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const snippet = (q.text || "").substring(0, 80);
    console.log(`(${i + 1}/${questions.length}) ${snippet}...`);

    const ok = await populateDifficulty(q.categoryId, q.questionId);
    if (ok) {
      success += 1;
    } else {
      fail += 1;
    }

    await sleep(options.delayMs);
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
