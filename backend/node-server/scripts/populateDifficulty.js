require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");

const OLLAMA_URL = process.env.OLLAMA_URL;

if (!OLLAMA_URL) {
  console.error("❌ Missing OLLAMA_URL in .env");
  process.exit(1);
}

async function populateDifficulty(categoryId, questionId) {
  try {
    // 1️⃣ Fetch the category
    const category = await Category.findById(categoryId);
    if (!category) {
      console.error(`❌ Category not found: ${categoryId}`);
      return false;
    }

    // 2️⃣ Locate question inside it
    const question = category.questions.find(
      q => q._id.equals(new mongoose.Types.ObjectId(questionId)) && q.disabled !== true
    );


    if (!question) {
      console.error(`❌ Question not found: ${questionId}`);
      console.log("👉 Available question IDs:", category.questions.map(q => q._id.toString()).slice(0, 5), "...");
      return false;
    }

    // 3️⃣ Build prompt
    const prompt = `
You are an assistant that classifies trivia questions into difficulty levels.

RUBRIC for "difficulty_level" (integer 1–10):
1–2 Very Easy: universally known, primary-school facts.
3–4 Easy: commonly taught basics.
5–6 Moderate: regional specifics, niche-but-accessible details.
7–8 Hard: specialized knowledge, advanced concepts, enthusiast-level facts.
9–10 Very Hard: highly obscure, expert/scholarly facts.

Additional guidance:
- Consider how widely known the fact is, not just its length or wording.
- If the answer requires academic study or field expertise → score higher.
- If the answer is guessable by most adults → score lower.
- Take into account the provided explanation: if it relies on context most people would not know, the difficulty rises.

Now classify the following trivia question:

Question: ${question.text}
Answers: ${question.answers.map(a => a.text).join(", ")}
Correct Answer: ${question.correct_answer}
Explanation: ${question.explanation || "N/A"}

Respond in strict JSON:
{
  "difficulty_level": <integer 1-10>,
  "difficulty_rationale": "<string explaining reasoning>"
}`.trim();

    // 4️⃣ Query Ollama
    const response = await axios.post(
      OLLAMA_URL,
      {
        model: "llama3",
        prompt,
        stream: false,
        options: {
          num_ctx: 2048,
          num_keep: 100,
          temperature: 0.0,
          top_p: 0.9,
          top_k: 30,
          repeat_penalty: 1.1,
          repeat_last_n: 32,
          num_predict: 120,
        },
      },
      { timeout: 180_000 }
    );

    const raw = String(response.data.response || "").trim();
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error(`❌ Failed to parse JSON for ${questionId}:`, raw);
      return false;
    }

    if (
      !parsed.difficulty_level ||
      typeof parsed.difficulty_level !== "number" ||
      !parsed.difficulty_rationale
    ) {
      console.error(`❌ Invalid model response for ${questionId}`);
      return false;
    }

    // 5️⃣ Save results into MongoDB
    await Category.updateOne(
      { "questions._id": questionId },
      {
        $set: {
          "questions.$.difficulty_level": parsed.difficulty_level,
          "questions.$.difficulty_rationale": parsed.difficulty_rationale,
          "questions.$.difficultyConfirmedVersion": 0.01,
        },
      }
    );

    console.log(`✅ Updated question ${questionId} → level ${parsed.difficulty_level}`);
    return true;
  } catch (err) {
    console.error(`❌ Error processing ${questionId}:`, err.message);
    return false;
  }
}

module.exports = { populateDifficulty };
