require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL;

// Ask Ollama if two questions mean the same thing
async function isDuplicate(q1, q2) {
  const prompt = `
You are a trivia question duplicate detector.
Decide if these two questions essentially mean the same thing, even if worded differently.

Respond STRICT JSON only:
{ "duplicate": true|false }

Question 1: ${q1}
Question 2: ${q2}
  `.trim();

  try {
    const response = await axios.post(OLLAMA_URL, {
      model: "llama3",
      prompt,
      options: {
        num_ctx: 1024,
        temperature: 0.0,
        num_predict: 50
      },
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

async function findAndDisableDuplicates() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Only pull categories with questions that are enabled and not checked yet
    const categories = await Category.find(
      { "questions.disabled": false, "questions.validation.duplicationChecked": { $ne: true } },
      { name: 1, questions: 1 }
    );

    for (const category of categories) {
      console.log(`🔹 Checking category: ${category.name}`);

      // Only enabled + not-checked questions
      const questions = category.questions.filter(
        q => !q.disabled && (!q.validation || q.validation.duplicationChecked !== true)
      );

      if (questions.length <= 1) continue;

      for (let i = 0; i < questions.length; i++) {
        const q1 = questions[i];

        for (let j = i + 1; j < questions.length; j++) {
          const q2 = questions[j];

          const duplicate = await isDuplicate(q1.text, q2.text);
          if (duplicate) {
            console.log(`   ⚠️ Duplicate found:\n      Q1: ${q1.text}\n      Q2: ${q2.text}`);

            // Keep q1, disable q2
            await Category.updateOne(
              { "questions._id": q2._id },
              {
                $set: {
                  "questions.$.disabled": true,
                  "questions.$.validation.duplicateOf": q1._id,
                  "questions.$.validation.duplicationChecked": true
                }
              }
            );

            console.log(`   ❌ Disabled duplicate: ${q2._id} (kept ${q1._id})`);
          }
        }

        // Mark q1 as checked even if no duplicates found
        await Category.updateOne(
          { "questions._id": q1._id },
          { $set: { "questions.$.validation.duplicationChecked": true } }
        );
      }
    }

    console.log("🎉 Duplicate scan complete!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error:", err.message);
    mongoose.connection.close();
  }
}

findAndDisableDuplicates();
