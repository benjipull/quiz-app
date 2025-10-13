require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL;
const DUPLICATE_VERSION = 0.14; // bump when changing duplicate logic

// 🧠 Ask Ollama if two questions mean the same thing
async function isDuplicate(q1, q2) {
  const prompt = `
You are a trivia question duplicate detector.
Determine if these two questions essentially mean the same thing, even if worded differently.

Respond STRICT JSON only:
{ "duplicate": true|false }

Question 1: ${q1}
Question 2: ${q2}
  `.trim();

  try {
    const response = await axios.post(OLLAMA_URL, {
      model: "llama3",
      prompt,
      options: { temperature: 0.0, num_ctx: 1024, num_predict: 50 },
      stream: false
    });

    const raw = response.data.response.trim();
    const parsed = JSON.parse(raw);
    return parsed.duplicate === true;
  } catch (err) {
    console.error("❌ Duplicate check failed:", err.message);
    return false;
  }
}

async function findDuplicatesAndMarkChecked() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    const categories = await Category.find(
      { "questions.disabled": false },
      { name: 1, questions: 1 }
    );

    for (const category of categories) {
      console.log(`\n🔹 Category: ${category.name}`);

      const questions = category.questions.filter(q => {
        if (q.disabled) return false;

        const version = q?.duplicate?.duplicate_checked_version ?? 0;
        return Number(version) < DUPLICATE_VERSION;
      });


      if (questions.length <= 1) continue;

      const duplicateGroups = [];
      const checked = new Set();

      for (let i = 0; i < questions.length; i++) {
        const qI = questions[i];
        if (checked.has(qI._id.toString())) continue;

        const group = [qI];
        checked.add(qI._id.toString()); // mark the base as checked right away

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
          // ✅ generate one shared groupId per detected group
          const groupId = new mongoose.Types.ObjectId().toString();
          const ids = group.map(q => q._id);

          await Category.updateOne(
            { _id: category._id },
            {
              $set: {
                "questions.$[elem].duplicate.duplicate_checked_version": DUPLICATE_VERSION,
                "questions.$[elem].duplicate.duplicate_group_id": groupId,
                "questions.$[elem].duplicate.last_checked_at": new Date()
              }
            },
            {
              arrayFilters: [{ "elem._id": { $in: ids } }]
            }
          );

          console.log(
            `⚠️ Duplicate group (${group.length}) saved for category "${category.name}" (GroupID: ${groupId}).`
          );
          group.forEach(q => console.log(`   ↳ ${q.text}`));
        } else {
          // no duplicates found for this question
          await Category.updateOne(
            { "questions._id": qI._id },
            {
              $set: {
                "questions.$.duplicate.duplicate_checked_version": DUPLICATE_VERSION,
                "questions.$.duplicate.duplicate_group_id": null,
                "questions.$.duplicate.last_checked_at": new Date()
              }
            }
          );
          console.log(`✅ Cleared question: "${qI.text}"`);
        }
      }


      // 🧾 Category summary
      if (duplicateGroups.length > 0) {
        console.log(`⚠️ Summary: ${duplicateGroups.length} duplicate group(s) in "${category.name}"`);
      } else {
        console.log(`✅ Category "${category.name}" fully cleared.`);
      }
    }

    console.log("\n🎉 Duplicate detection complete!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error:", err.message);
    mongoose.connection.close();
  }
}

findDuplicatesAndMarkChecked();
