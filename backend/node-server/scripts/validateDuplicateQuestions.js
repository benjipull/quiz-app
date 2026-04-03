require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");
installScriptErrorPrefix();
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");
const { buildDuplicatePrompt } = require("./prompts/duplicatePrompt");
const {
  assertOllamaSetup,
  callOllamaForText,
} = require("../services/ollamaClient");
const { normalizeJsonText, parseJsonObject } = require("./jsonParsingHelper");

const DUPLICATE_VERSION = 0.20;
const DEFAULT_DUPLICATE_TIMEOUT_MS = 180_000;
const DEFAULT_DUPLICATE_MAX_ATTEMPTS = 3;
const DEFAULT_DUPLICATE_RETRY_DELAY_MS = 1_500;

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

const DUPLICATE_TIMEOUT_MS = parsePositiveInt(
  process.env.DUPLICATE_CHECK_TIMEOUT_MS ?? process.env.OLLAMA_DUPLICATE_TIMEOUT_MS,
  DEFAULT_DUPLICATE_TIMEOUT_MS
);
const DUPLICATE_MAX_ATTEMPTS = parsePositiveInt(
  process.env.DUPLICATE_CHECK_MAX_ATTEMPTS,
  DEFAULT_DUPLICATE_MAX_ATTEMPTS
);
const DUPLICATE_RETRY_DELAY_MS = parsePositiveInt(
  process.env.DUPLICATE_CHECK_RETRY_DELAY_MS,
  DEFAULT_DUPLICATE_RETRY_DELAY_MS
);

try {
  assertOllamaSetup();
} catch (error) {
  console.error(`ERROR ${error.message}`);
  process.exit(1);
}

function isTimeoutError(error) {
  return error?.code === "ECONNABORTED" || /timeout/i.test(String(error?.message || ""));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeModelText(raw) {
  return normalizeJsonText(raw, {
    stripMarkdown: true,
    stripThinkTags: true,
    normalizeQuotes: false,
  });
}

function toDuplicateResult(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  if (typeof candidate.duplicate !== "boolean") return null;
  return {
    duplicate: candidate.duplicate,
    reason: typeof candidate.reason === "string" ? candidate.reason : "",
  };
}

function parseDuplicateResult(raw) {
  const cleaned = normalizeModelText(raw);
  if (!cleaned) return null;

  const parsed = parseJsonObject(cleaned, {
    normalizeOptions: {
      stripMarkdown: false,
      stripThinkTags: false,
      normalizeQuotes: true,
    },
  });
  const normalized = toDuplicateResult(parsed);
  if (normalized) {
    return normalized;
  }

  const duplicateMatch = cleaned.match(/\bduplicate\b\s*[:=]\s*(true|false)/i);
  if (duplicateMatch) {
    const duplicateValue = String(duplicateMatch[1]).toLowerCase() === "true";
    const reasonMatch = cleaned.match(/\breason\b\s*[:=]\s*"([^"]*)"/i);
    return {
      duplicate: duplicateValue,
      reason: reasonMatch ? reasonMatch[1] : "",
    };
  }

  return null;
}

async function queryOllama(prompt) {
  let lastError = null;
  let lastRaw = "";

  for (let attempt = 1; attempt <= DUPLICATE_MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callOllamaForText({
        prompt,
        presetName: "validateDuplicateQuestions",
        overrides: {
          timeoutMs: DUPLICATE_TIMEOUT_MS,
        },
      });

      lastRaw = String(raw || "");
      const parsed = parseDuplicateResult(lastRaw);
      if (parsed) {
        return parsed;
      }

      if (attempt < DUPLICATE_MAX_ATTEMPTS) {
        const delayMs = DUPLICATE_RETRY_DELAY_MS * attempt;
        const normalizedPreview = normalizeModelText(lastRaw).slice(0, 200);
        const rawPreview = String(lastRaw || "").slice(0, 200);
        const preview = normalizedPreview || rawPreview;
        console.warn(
          `WARN Invalid duplicate-check response (attempt ${attempt}/${DUPLICATE_MAX_ATTEMPTS}). Retrying in ${delayMs}ms...`
        );
        console.warn(`WARN Model output preview: ${preview || "<empty>"}`);
        await sleep(delayMs);
        continue;
      }

      break;
    } catch (error) {
      lastError = error;
      const timedOut = isTimeoutError(error);
      const shouldRetry = timedOut && attempt < DUPLICATE_MAX_ATTEMPTS;

      if (shouldRetry) {
        const delayMs = DUPLICATE_RETRY_DELAY_MS * attempt;
        console.warn(
          `WARN Ollama duplicate check timed out (attempt ${attempt}/${DUPLICATE_MAX_ATTEMPTS}, timeout ${DUPLICATE_TIMEOUT_MS}ms). Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
        continue;
      }

      break;
    }
  }

  if (lastError) {
    console.error(
      "ERROR Ollama duplicate check failed:",
      lastError?.response?.data || lastError?.message
    );
  } else {
    const normalizedPreview = normalizeModelText(lastRaw).slice(0, 200);
    const rawPreview = String(lastRaw || "").slice(0, 200);
    const preview = normalizedPreview || rawPreview;
    console.error("ERROR Ollama duplicate check failed: invalid model response.");
    console.error(`ERROR Model output preview: ${preview || "<empty>"}`);
  }

  return { duplicate: false, reason: "Request failed" };
}

async function isDuplicate(q1, q2) {
  const prompt = buildDuplicatePrompt(q1, q2);
  return queryOllama(prompt);
}

async function updateDuplicateGroup(categoryId, questionIds, groupId) {
  await Category.updateOne(
    { _id: categoryId },
    {
      $set: {
        "questions.$[elem].duplicate.duplicate_checked_version": DUPLICATE_VERSION,
        "questions.$[elem].duplicate.duplicate_group_id": groupId,
        "questions.$[elem].duplicate.last_checked_at": new Date(),
        "questions.$[elem].needs_validation": true,
        "questions.$[elem].duplicate.reasoning": "Potential duplicate - requires validation",
      },
    },
    {
      arrayFilters: [{ "elem._id": { $in: questionIds } }],
    }
  );
}

async function clearQuestionDuplicateFlag(questionId) {
  await Category.updateOne(
    { "questions._id": questionId },
    {
      $set: {
        "questions.$.duplicate.duplicate_checked_version": DUPLICATE_VERSION,
        "questions.$.duplicate.duplicate_group_id": null,
        "questions.$.duplicate.last_checked_at": new Date(),
        "questions.$.needs_validation": false,
        "questions.$.duplicate.reasoning": "",
      },
    }
  );
}

async function processCategory(category) {
  console.log(`\nCategory: ${category.name}`);

  let questions = category.questions.filter((q) => {
    if (q.disabled) return false;
    const version = q?.duplicate?.duplicate_checked_version ?? 0;
    return Number(version) < DUPLICATE_VERSION;
  });

  if (questions.length <= 1) return;

  const checked = new Set();

  while (questions.length > 0) {
    const qI = questions.shift();
    if (checked.has(qI._id.toString())) continue;

    const group = [qI];
    checked.add(qI._id.toString());

    for (let j = 0; j < questions.length; j++) {
      const qJ = questions[j];
      if (checked.has(qJ._id.toString())) continue;

      const { duplicate, reason } = await isDuplicate(qI, qJ);
      if (duplicate) {
        console.log(`   DUPLICATE "${qI.text}" <-> "${qJ.text}"`);
        console.log(`      Reason: ${reason}`);
        group.push(qJ);
        checked.add(qJ._id.toString());
      }
    }

    if (group.length > 1) {
      const groupIds = new Set(group.map((item) => item._id.toString()));
      questions = questions.filter((q) => !groupIds.has(q._id.toString()));

      const groupId = new mongoose.Types.ObjectId().toString();
      const ids = group.map((q) => q._id);
      await updateDuplicateGroup(category._id, ids, groupId);

      console.log(
        `WARN Duplicate group (${group.length}) saved for category "${category.name}" (GroupID: ${groupId}).`
      );
      group.forEach((q) => console.log(`   -> ${q.text}`));
    } else {
      await clearQuestionDuplicateFlag(qI._id);
      console.log(`OK Cleared question: "${qI.text}"`);
    }
  }

  console.log(`OK Category "${category.name}" complete.`);
}

async function findDuplicatesAndMarkChecked() {
  try {
    await connectDB();
    console.log("OK Connected to MongoDB");
    console.log(
      `INFO Duplicate-check settings: timeout=${DUPLICATE_TIMEOUT_MS}ms attempts=${DUPLICATE_MAX_ATTEMPTS} retryDelay=${DUPLICATE_RETRY_DELAY_MS}ms`
    );

    const categories = await Category.find(
      { "questions.disabled": false },
      { name: 1, questions: 1 }
    );

    for (const category of categories) {
      await processCategory(category);
    }

    console.log("\nDuplicate detection complete.");
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

if (require.main === module && process.env.RUN_DUPLICATE_CHECK === "true") {
  findDuplicatesAndMarkChecked();
}

module.exports = { processSingleQuestion: null };
