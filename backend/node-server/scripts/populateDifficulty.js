require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");


const OLLAMA_URL = process.env.OLLAMA_URL || "http://ollama-container:11440/api/generate";

if (!process.env.MONGO_URI) {
  console.error("❌ Missing MONGO_URI in .env");
  process.exit(1);
}

console.log(`🚀 Ollama API set to: ${OLLAMA_URL}`);

async function run(questionId) {
  try {
    // 1. Connect to DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 2. Find category containing the question
    const category = await Category.findOne(
      { "questions._id": questionId },
      { "questions.$": 1 } // project only the matching question
    );

    if (!category || category.questions.length === 0) {
      console.error("❌ Question not found");
      process.exit(1);
    }

    const question = category.questions[0];

    // 3. Build prompt
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
- Focus on **knowledge accessibility**, not trivia trickiness.

Now classify the following trivia question:

Question: ${question.text}
Answers: ${question.answers.map(a => a.text).join(", ")}
Correct Answer: ${question.correct_answer}
Explanation: ${question.explanation || "N/A"}

Respond in strict JSON:
{
  "difficulty_level": <integer 1-10>,
  "difficulty_rationale": "<string explaining reasoning>"
}
    `.trim();

    // 4. Send to Ollama
    const response = await axios.post(OLLAMA_URL, {
      model: "mistral",
      prompt,
      options: {
        // Context & prompt handling
        num_ctx: 4096,       // plenty for your prompt + question + answers
        num_keep: 200,       // keeps the rubric/system part "sticky"

        // Output stability
        temperature: 0.0,    // force deterministic outputs (avoid randomness)
        top_p: 0.9,          // still lets the model rank tokens well
        top_k: 40,           // wider candidate pool, but fine at 40
        min_p: 0.05,         // don't prune too aggressively

        // Prevent repetition/noise
        repeat_penalty: 1.1, // mild penalty is enough here
        repeat_last_n: 64,   // short repetition window (JSON only needs short)

        // Output length
        num_predict: 200     // your JSON will be <200 tokens
      },
      stream: false
    });

    let raw = response.data.response.trim();
    console.log("🔍 Raw model response:", raw);

    // 5. Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Failed to parse JSON:", err.message);
      process.exit(1);
    }

    if (
      !parsed.difficulty_level ||
      typeof parsed.difficulty_level !== "number" ||
      !parsed.difficulty_rationale
    ) {
      console.error("❌ Invalid response format from model.");
      process.exit(1);
    }

    // 6. Update question
    const updatedCategory = await Category.findOneAndUpdate(
      { "questions._id": questionId },
      {
        $set: {
          "questions.$.difficulty_level": parsed.difficulty_level,
          "questions.$.difficulty_rationale": parsed.difficulty_rationale,
          "questions.$.difficultyConfirmedVersion": 0.01
        }
      },
      { new: true }
    );

    console.log("✅ Question updated successfully!");
    console.log(updatedCategory.questions.find(q => q._id.toString() === questionId.toString()));

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

// Accept questionId from command line
const questionId = process.argv[2];
if (!questionId) {
  console.error("Usage: node setDifficulty.js <questionId>");
  process.exit(1);
}

run(questionId);
