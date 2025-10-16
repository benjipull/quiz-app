require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");
const { buildDuplicatePrompt } = require("./prompts/duplicatePrompt"); // new file below 👇

const OLLAMA_URL = process.env.OLLAMA_URL;
const DUPLICATE_VERSION = 0.14;

// =========================
// 🔹 Ollama Communication
// =========================
async function queryOllama(prompt) {
  try {
    const res = await axios.post(
      OLLAMA_URL,
      {
        model: "llama3",
        prompt,
        options: { temperature: 0.0, num_ctx: 4096, num_predict: 50 },
        stream: false,
      },
      { timeout: 60_000 }
    );

    const raw = String(res.data.response || "").trim();
    const parsed = JSON.parse(raw);
    return parsed.duplicate === true;
  } catch (err) {
    console.error("❌ Ollama duplicate check failed:", err.message);
    return false;
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
      },
    }
  );
}

// =========================
// 🔹 Core Duplicate Logic
// =========================
async function processCategory(category) {
  console.log(`\n🔹 Category: ${category.name}`);

  const questions = category.questions.filter((q) => {
    if (q.disabled) return false;
    const version = q?.duplicate?.duplicate_checked_version ?? 0;
    return Number(version) < DUPLICATE_VERSION;
  });

  if (questions.length <= 1) {
    console.log(`ℹ️ Skipping (only one question).`);
    return;
  }

  const checked = new Set();

  for (let i = 0; i < questions.length; i++) {
    const qI = questions[i];
    if (checked.has(qI._id.toString())) continue;

    const group = [qI];
    checked.add(qI._id.toString());

    for (let j = i + 1; j < questions.length; j++) {
      const qJ = questions[j];
      if (checked.has(qJ._id.toString())) continue;

      const duplicate = await isDuplicate(qI.text, qJ.text);

      if (duplicate) {
        group.push(qJ);
        checked.add(qJ._id.toString());
      }
    }

    if (group.length > 1) {
      const groupId = new mongoose.Types.ObjectId().toString();
      const ids = group.map((q) => q._id);
      await updateDuplicateGroup(category._id, ids, groupId);

      // 🟠 Mark only the *new question* as pending validation
      const newQuestion = group.find(q => q.new_question);
      if (newQuestion) {
        await Category.updateOne(
          { _id: category._id, "questions._id": newQuestion._id },
          {
            $set: {
              "questions.$.needs_validation": true,
              "questions.$.duplicate.reasoning": "Potential duplicate — requires validation",
              "questions.$.duplicate.last_checked_at": new Date(),
            },
          }
        );
      }

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
// 🔹 Single Question Duplicate Check
// =========================
async function processSingleQuestion(category, targetQuestion) {
  console.log(`\n🔍 Checking duplicates for: "${targetQuestion.text}" in ${category.name}`);

  // Include ALL questions except itself (even disabled)
  const otherQuestions = category.questions.filter(
    q => q._id.toString() !== targetQuestion._id.toString()
  );

  if (otherQuestions.length === 0) {
    console.log("ℹ️ No other questions to compare against.");
    return;
  }

  const duplicates = [];

  for (const q of otherQuestions) {
    const duplicate = await isDuplicate(targetQuestion, q); // pass full models now
    if (duplicate) {
      duplicates.push(q);
    }
  }

  if (duplicates.length > 0) {
    const groupId = new mongoose.Types.ObjectId().toString();
    const ids = [targetQuestion._id, ...duplicates.map(q => q._id)];

    // Mark all questions in the same group
    await updateDuplicateGroup(category._id, ids, groupId);

    // ✅ Explicitly mark which one is new (so UI knows which to validate)
    await Category.updateOne(
      { _id: category._id, "questions._id": targetQuestion._id },
      {
        $set: {
          "questions.$.duplicate.new_question": true,
          "questions.$.duplicate.duplicate_group_id": groupId,
        },
      }
    );

    // ✅ Mark all the others as not new
    await Category.updateMany(
      {
        _id: category._id,
        "questions._id": { $in: duplicates.map(q => q._id) },
      },
      {
        $set: {
          "questions.$[q].duplicate.new_question": false,
          "questions.$[q].duplicate.duplicate_group_id": groupId,
        },
      },
      { arrayFilters: [{ "q._id": { $exists: true } }] }
    );

    console.log(
      `⚠️ Found ${duplicates.length} duplicates for "${targetQuestion.text}" (GroupID: ${groupId})`
    );
    duplicates.forEach(q => console.log(`   ↳ ${q.text}`));
  } else {
    await clearQuestionDuplicateFlag(targetQuestion._id);
    console.log(`✅ No duplicates found for "${targetQuestion.text}".`);
  }


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

//findDuplicatesAndMarkChecked();
module.exports = { processSingleQuestion };
