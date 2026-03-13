require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");
const { buildDuplicatePrompt } = require("./prompts/duplicatePrompt");

const OLLAMA_URL = process.env.OLLAMA_URL;
const DUPLICATE_VERSION = 0.18;

async function queryOllama(prompt) {
  try {
    const res = await axios.post(
      OLLAMA_URL,
      {
        model: "qwen3:8b",
        prompt,
        options: {
          temperature: 0.0,      // eliminate creativity — factual only
          top_p: 0.8,            // less diversity in sampling
          top_k: 20,             // focus on most likely tokens
          repeat_penalty: 1.2,   // discourage alternative phrasing loops
          num_ctx: 4096,         // enough context for longer comparisons
          num_predict: 60        // short, focused output
        },
        stream: false,
      },
      { timeout: 60_000 }
    );

    const raw = String(res.data.response || "").trim();

    // Extract everything from the first { to the end
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error("⚠️ Invalid JSON from model:", raw.slice(0, 200));
      return { duplicate: false, reason: "Invalid JSON (no { found)" };
    }

    // Try to repair truncated JSON (missing closing brace, curly quotes, etc.)
    let text = jsonMatch[0]
      .replace(/“|”/g, '"') // replace fancy quotes
      .replace(/,\s*$/, "") // trailing commas
      .trim();

    if (!text.endsWith("}")) text += "}"; // add closing brace if missing

    let parsedObj;
    try {
      parsedObj = JSON.parse(text);
    } catch (e) {
      console.error("⚠️ JSON parse error:", e.message, raw.slice(0, 200));
      return { duplicate: false, reason: "Parse error" };
    }

    // Validate parsed object
    if (typeof parsedObj.duplicate !== "boolean") parsedObj.duplicate = false;
    if (typeof parsedObj.reason !== "string") parsedObj.reason = "";

    return {
      duplicate: parsedObj.duplicate,
      reason: parsedObj.reason,
    };

  } catch (err) {
    console.error("❌ Ollama duplicate check failed:", err.response?.data || err.message);
    return { duplicate: false, reason: "Request failed" };
  }
}


// =========================
// 🔹 Duplicate Checking
// =========================
async function isDuplicate(q1, q2) {
  const prompt = buildDuplicatePrompt(q1, q2);
  return queryOllama(prompt);
}

// =========================
// 🔹 Database Update Helpers
// =========================
async function updateDuplicateGroup(categoryId, questionIds, groupId) {
  await Category.updateOne(
    { _id: categoryId },
    {
      $set: {
        "questions.$[elem].duplicate.duplicate_checked_version": DUPLICATE_VERSION,
        "questions.$[elem].duplicate.duplicate_group_id": groupId,
        "questions.$[elem].duplicate.last_checked_at": new Date(),
        "questions.$[elem].needs_validation": true,
        "questions.$[elem].duplicate.reasoning": "Potential duplicate — requires validation",
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
  console.log(`\n🔹 Category: ${category.name}`);

  let questions = category.questions.filter((q) => {
    if (q.disabled) return false;
    const version = q?.duplicate?.duplicate_checked_version ?? 0;
    return Number(version) < DUPLICATE_VERSION;
  });

  if (questions.length <= 1) {
    return;
  }

  const checked = new Set();

  while (questions.length > 0) {
    const qI = questions.shift(); // take the first question out
    if (checked.has(qI._id.toString())) continue;

    const group = [qI];
    checked.add(qI._id.toString());

    for (let j = 0; j < questions.length; j++) {
      const qJ = questions[j];
      if (checked.has(qJ._id.toString())) continue;

      const { duplicate, reason } = await isDuplicate(qI, qJ);
      if (duplicate) {
        console.log(`   🔁 "${qI.text}" ↔ "${qJ.text}"`);
        console.log(`      🤖 Reason: ${reason}`);
        group.push(qJ);
        checked.add(qJ._id.toString());
      }
    }

    if (group.length > 1) {
      // 🧹 Remove this group’s members from future checks
      const groupIds = new Set(group.map((g) => g._id.toString()));
      questions = questions.filter((q) => !groupIds.has(q._id.toString()));

      const groupId = new mongoose.Types.ObjectId().toString();
      const ids = group.map((q) => q._id);
      await updateDuplicateGroup(category._id, ids, groupId);

      console.log(
        `⚠️ Duplicate group (${group.length}) saved for category "${category.name}" (GroupID: ${groupId}).`
      );
      group.forEach((q) => console.log(`   ↳ ${q.text}`));
    } else {
      await clearQuestionDuplicateFlag(qI._id);
      console.log(`✅ Cleared question: "${qI.text}"`);
    }
  }

  console.log(`✅ Category "${category.name}" complete.`);
}


// =========================
// 🔹 Main Entry
// =========================
async function findDuplicatesAndMarkChecked() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    const categories = await Category.find(
      { "questions.disabled": false },
      { name: 1, questions: 1 }
    );

    for (const category of categories) {
      await processCategory(category);
    }

    console.log("\n🎉 Duplicate detection complete!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    mongoose.connection.close();
  }
}

if (require.main === module && process.env.RUN_DUPLICATE_CHECK === "true") {
  findDuplicatesAndMarkChecked();
}


module.exports = { processSingleQuestion: null };
