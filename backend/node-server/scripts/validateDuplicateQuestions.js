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
  // Check if answers match - if they do, mark as duplicate without AI check
  if (q1.correct_answer && q2.correct_answer &&
      q1.correct_answer.trim().toLowerCase() === q2.correct_answer.trim().toLowerCase()) {
    console.log(`   ⚡ FAST-DUPLICATE (same answer): "${q1.text}" <-> "${q2.text}"`);
    console.log(`      Answer: "${q1.correct_answer}"`);
    return {
      duplicate: true,
      reason: "Same correct answer in same category"
    };
  }

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

function normalizeQuestionVersion(question) {
  const parsed = Number(question?.version);
  if (!Number.isFinite(parsed)) return Number.MAX_SAFE_INTEGER;
  return parsed;
}

function pickOldestVersionQuestion(group) {
  if (!Array.isArray(group) || group.length === 0) return null;

  let selected = group[0];
  let selectedVersion = normalizeQuestionVersion(selected);

  for (let i = 1; i < group.length; i++) {
    const candidate = group[i];
    const candidateVersion = normalizeQuestionVersion(candidate);
    if (candidateVersion < selectedVersion) {
      selected = candidate;
      selectedVersion = candidateVersion;
    }
  }

  return selected;
}

function buildDisableDuplicateGroupUpdate(questionIds, keepQuestionId) {
  return {
    $set: {
      "questions.$[elem].disabled": true,
      "questions.$[elem].disabled_reason": "Marked as duplicate",
    },
    arrayFilters: [
      {
        "elem._id": {
          $in: questionIds,
          $ne: keepQuestionId,
        },
      },
    ],
  };
}

async function disableDuplicateGroupExceptKeep(categoryId, questionIds, keepQuestionId) {
  const payload = buildDisableDuplicateGroupUpdate(questionIds, keepQuestionId);
  await Category.updateOne(
    { _id: categoryId },
    {
      $set: payload.$set,
    },
    {
      arrayFilters: payload.arrayFilters,
    }
  );
}

async function disableQuestionAsDuplicate(categoryId, questionId, groupId, reason, duplicateOfQuestionId) {
  await Category.updateOne(
    { _id: categoryId, "questions._id": questionId },
    {
      $set: {
        "questions.$.disabled": true,
        "questions.$.disabled_reason": "Marked as duplicate",
        "questions.$.duplicate.duplicate_checked_version": DUPLICATE_VERSION,
        "questions.$.duplicate.duplicate_group_id": groupId,
        "questions.$.duplicate.last_checked_at": new Date(),
        "questions.$.duplicate.reasoning": reason || "Potential duplicate - requires validation",
        "questions.$.needs_validation": true,
      },
      $addToSet: {
        "questions.$.duplicate.duplicate_of": duplicateOfQuestionId,
      },
    }
  );
}

async function markQuestionComparedNoDuplicate(questionId) {
  await Category.updateOne(
    { "questions._id": questionId },
    {
      $set: {
        "questions.$.duplicate.duplicate_checked_version": DUPLICATE_VERSION,
        "questions.$.duplicate.duplicate_group_id": null,
        "questions.$.duplicate.last_checked_at": new Date(),
        "questions.$.duplicate.reasoning": "",
        "questions.$.needs_validation": false,
      },
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

async function processSingleQuestion(categoryId, questionId) {
  const category = await Category.findOne(
    { _id: categoryId, "questions._id": questionId },
    { name: 1, questions: 1 }
  );
  if (!category) {
    return {
      success: false,
      duplicateFound: false,
      comparedCount: 0,
      reason: "Category or question not found.",
    };
  }

  const sourceQuestion = category.questions.find(
    (question) => question._id.toString() === String(questionId)
  );
  if (!sourceQuestion) {
    return {
      success: false,
      duplicateFound: false,
      comparedCount: 0,
      reason: "Question not found in category.",
    };
  }

  if (sourceQuestion.disabled) {
    return {
      success: true,
      duplicateFound: false,
      comparedCount: 0,
      reason: "Question is already disabled.",
    };
  }

  const otherEnabledQuestions = category.questions.filter(
    (question) =>
      !question.disabled &&
      question._id.toString() !== sourceQuestion._id.toString()
  );

  if (otherEnabledQuestions.length === 0) {
    await markQuestionComparedNoDuplicate(sourceQuestion._id);
    return {
      success: true,
      duplicateFound: false,
      comparedCount: 0,
      reason: "No other enabled questions available for duplicate comparison.",
    };
  }

  let comparedCount = 0;
  for (const candidateQuestion of otherEnabledQuestions) {
    comparedCount += 1;
    const { duplicate, reason } = await isDuplicate(sourceQuestion, candidateQuestion);
    if (!duplicate) {
      continue;
    }

    const groupId = new mongoose.Types.ObjectId().toString();
    await updateDuplicateGroup(
      category._id,
      [sourceQuestion._id, candidateQuestion._id],
      groupId
    );
    await disableQuestionAsDuplicate(
      category._id,
      sourceQuestion._id,
      groupId,
      reason,
      candidateQuestion._id
    );

    console.log(
      `❌ WARN Duplicate found in category "${category.name}" for "${sourceQuestion.text}" against "${candidateQuestion.text}". Source question disabled.`
    );
    return {
      success: true,
      duplicateFound: true,
      comparedCount,
      reason: reason || "",
      matchedQuestionId: candidateQuestion._id.toString(),
      groupId,
    };
  }

  await markQuestionComparedNoDuplicate(sourceQuestion._id);
  return {
    success: true,
    duplicateFound: false,
    comparedCount,
  };
}

async function processCategoryAnswerDuplicatesOnly(category) {
  console.log(`\n[FAST PASS] Category: ${category.name}`);

  const questions = category.questions.filter((q) => !q.disabled);

  if (questions.length <= 1) {
    console.log(`   Skipping (only ${questions.length} enabled question)`);
    return;
  }

  // Group questions by their correct answer
  const answerGroups = new Map();
  for (const q of questions) {
    if (!q.correct_answer) continue;
    const normalizedAnswer = q.correct_answer.trim().toLowerCase();
    if (!answerGroups.has(normalizedAnswer)) {
      answerGroups.set(normalizedAnswer, []);
    }
    answerGroups.get(normalizedAnswer).push(q);
  }

  let duplicatesFound = 0;
  // Process groups with more than one question
  for (const [answer, group] of answerGroups.entries()) {
    if (group.length > 1) {
      duplicatesFound++;
      const groupId = new mongoose.Types.ObjectId().toString();
      const ids = group.map((q) => q._id);
      const keepQuestion = pickOldestVersionQuestion(group);

      await updateDuplicateGroup(category._id, ids, groupId);
      if (keepQuestion?._id) {
        await disableDuplicateGroupExceptKeep(category._id, ids, keepQuestion._id);
      }

      console.log(
        `   ⚡ Same-answer group (${group.length}) - Answer: "${answer}"`
      );
      if (keepQuestion) {
        console.log(
          `      ✓ Keeping: "${keepQuestion.text}" (v${Number(keepQuestion.version) || 0})`
        );
      }
      group.forEach((q) => {
        if (q._id.toString() !== keepQuestion?._id.toString()) {
          console.log(`      ✗ Disabled: "${q.text}"`);
        }
      });
    }
  }

  if (duplicatesFound === 0) {
    console.log(`   ✓ No same-answer duplicates found`);
  } else {
    console.log(`   ✓ Processed ${duplicatesFound} duplicate group(s)`);
  }
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
    let isFastDuplicate = false;

    for (let j = 0; j < questions.length; j++) {
      const qJ = questions[j];
      if (checked.has(qJ._id.toString())) continue;

      const { duplicate, reason } = await isDuplicate(qI, qJ);
      if (duplicate) {
        console.log(`   DUPLICATE "${qI.text}" <-> "${qJ.text}"`);
        console.log(`      Reason: ${reason}`);
        group.push(qJ);
        checked.add(qJ._id.toString());

        // If this was a fast duplicate (same answer), stop checking further
        if (reason === "Same correct answer in same category") {
          isFastDuplicate = true;
          break;
        }
      }
    }

    if (group.length > 1) {
      const groupIds = new Set(group.map((item) => item._id.toString()));
      questions = questions.filter((q) => !groupIds.has(q._id.toString()));

      const groupId = new mongoose.Types.ObjectId().toString();
      const ids = group.map((q) => q._id);
      const keepQuestion = pickOldestVersionQuestion(group);
      await updateDuplicateGroup(category._id, ids, groupId);
      if (keepQuestion?._id) {
        await disableDuplicateGroupExceptKeep(category._id, ids, keepQuestion._id);
      }

      console.log(
        `WARN Duplicate group (${group.length}) saved for category "${category.name}" (GroupID: ${groupId}).`
      );
      if (keepQuestion) {
        console.log(
          `INFO Keeping enabled: "${keepQuestion.text}" (version ${Number(keepQuestion.version) || 0}).`
        );
      }
      group.forEach((q) => console.log(`   -> ${q.text}`));
    } else {
      await clearQuestionDuplicateFlag(qI._id);
      console.log(`OK Cleared question: "${qI.text}"`);
    }
  }

  console.log(`OK Category "${category.name}" complete.`);
}

function ensureOllamaSetupOrExit() {
  try {
    assertOllamaSetup();
    return true;
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
    return false;
  }
}

async function findAnswerDuplicatesOnly() {
  try {
    await connectDB();
    console.log("OK Connected to MongoDB");
    console.log("INFO Running FAST PASS - checking for same-answer duplicates only\n");

    const categories = await Category.find(
      { "questions.disabled": false },
      { name: 1, questions: 1 }
    );

    for (const category of categories) {
      await processCategoryAnswerDuplicatesOnly(category);
    }

    console.log("\n✓ Answer-based duplicate detection complete.");
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

async function findDuplicatesAndMarkChecked() {
  try {
    const hasValidSetup = ensureOllamaSetupOrExit();
    if (!hasValidSetup) return;

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

if (require.main === module) {
  if (process.env.RUN_ANSWER_DUPLICATE_CHECK === "true") {
    findAnswerDuplicatesOnly();
  } else if (process.env.RUN_DUPLICATE_CHECK === "true") {
    findDuplicatesAndMarkChecked();
  }
}

module.exports = {
  processSingleQuestion,
  pickOldestVersionQuestion,
  buildDisableDuplicateGroupUpdate,
  findAnswerDuplicatesOnly,
};
