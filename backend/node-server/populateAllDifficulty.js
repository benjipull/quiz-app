const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { installScriptErrorPrefix } = require("./scripts/errorLogger");
installScriptErrorPrefix();

const mongoose = require("mongoose");
const Category = require("./models/categoryModel");
const connectDB = require("./config/db");
const { populateDifficulty } = require("./scripts/populateDifficulty");
const { runWithConcurrencyPool } = require("./scripts/concurrencyPool");

const DEFAULT_LIMIT = 1000;
const DEFAULT_DELAY_MS = 500;
const DEFAULT_PARALLEL = 1;

function buildHasImage64Expr() {
  return {
    $let: {
      vars: {
        normalizedImage64: {
          $toLower: {
            $trim: {
              input: { $ifNull: ["$questions.image64", ""] },
            },
          },
        },
      },
      in: {
        $and: [
          { $ne: ["$$normalizedImage64", ""] },
          { $ne: ["$$normalizedImage64", "null"] },
          { $ne: ["$$normalizedImage64", "undefined"] },
        ],
      },
    },
  };
}

function printUsage() {
  console.log("Usage: node populateAllDifficulty.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --category-id=<id>    Process questions only from a specific category.");
  console.log("  --difficulty-level=<n> Process questions whose current difficulty_level is n (1-10).");
  console.log("  --images-only         Process only questions that have a populated image64.");
  console.log("  --all                 Process all enabled questions.");
  console.log("  --pending-only        Process only questions missing difficulty (default).");
  console.log(`  --limit=<n>           Max questions to process (${DEFAULT_LIMIT} default, 0 = no limit).`);
  console.log(`  --delay-ms=<n>        Delay after each processed question in milliseconds (${DEFAULT_DELAY_MS} default).`);
  console.log(`  --parallel=<n>        Number of questions to process in parallel (${DEFAULT_PARALLEL} default).`);
  console.log("  --concurrency=<n>     Alias for --parallel.");
  console.log("  -n <n>, -p <n>        Shorthand for --parallel.");
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

function parseDifficultyLevel(value) {
  const level = parseMinOneInt(value, "difficulty-level");
  if (level > 10) {
    throw new Error(`Invalid difficulty-level: ${value}`);
  }
  return level;
}

function parseArgs(args) {
  const options = {
    processAll: false,
    limit: DEFAULT_LIMIT,
    delayMs: DEFAULT_DELAY_MS,
    parallel: DEFAULT_PARALLEL,
    categoryId: null,
    difficultyLevel: null,
    imagesOnly: false,
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

    if (arg === "--images-only") {
      options.imagesOnly = true;
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

    if (arg === "--difficulty-level") {
      const value = args[i + 1];
      if (value == null) {
        throw new Error("Missing value for --difficulty-level");
      }
      options.difficultyLevel = parseDifficultyLevel(value);
      i += 1;
      continue;
    }

    if (arg.startsWith("--difficulty-level=")) {
      options.difficultyLevel = parseDifficultyLevel(arg.split("=")[1]);
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

  if (options.difficultyLevel != null) {
    match["questions.difficulty_level"] = options.difficultyLevel;
  }

  // Always process enabled questions only.
  match["questions.disabled"] = { $ne: true };

  if (options.imagesOnly) {
    match.$expr = buildHasImage64Expr();
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
        hasImage64: buildHasImage64Expr(),
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
  const categoryLabel = options.categoryId ? options.categoryId : "all categories";
  const difficultyLabel =
    options.difficultyLevel == null ? "all levels" : `level ${options.difficultyLevel}`;
  const imageFilterLabel = options.imagesOnly ? "images-only" : "with/without images";
  const limitLabel = options.limit > 0 ? String(options.limit) : "none";
  console.log(
    `Running difficulty population in ${mode} mode (enabled only, category=${categoryLabel}, difficulty=${difficultyLabel}, imageFilter=${imageFilterLabel}, limit=${limitLabel}, delay=${options.delayMs}ms, parallel=${options.parallel}).`
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
        return await populateDifficulty(q.categoryId, q.questionId, {
          progress: {
            current: index + 1,
            total: questions.length,
          },
          imagesOnly: options.imagesOnly,
          forceHasImage64: q.hasImage64 === true,
        });
      } finally {
        if (options.delayMs > 0) {
          await sleep(options.delayMs);
        }
      }
    }
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
