require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL;

// 🟢 Category name from CLI argument
const preferredCategory = process.argv[2];

async function validateQuestion(question) {
  const prompt = `
You are a strict trivia question validator.  
You must check logical correctness and consistency of the Q&A.

Checks to perform:
1. Assess whether the question itself is logically and factually coherent.
   Detect any false or misleading assumptions or contradictions implied by the question text,
   even if they arise from inconsistent terminology or incompatible relationships.
2. Verify that the "correct_answer" logically satisfies the question as stated, without requiring reinterpretation.
3. Check that the explanation is consistent with both the question and the correct_answer in factual meaning and logical relationship.
4. Identify any semantic mismatches where the question, correct_answer, or explanation describe different facts, categories, or relationships.
   (For example, differences in type, scope, or property — e.g., location vs. boundary, invention vs. discovery, effect vs. cause.)
5. Determine if any of the other answers could also satisfy the question logically.
6. Provide a final verdict based on whether the question and its answer–explanation set form a single, unambiguous, factually consistent statement.

Respond in strict JSON ONLY:
{
  "is_correct_answer_valid": true|false,
  "correct_answer_reasoning": "<why correct or not>",
  "explanation_consistent": true|false,
  "explanation_reasoning": "<why consistent or not>",
  "other_answers_possible": [ "<answer1>", "<answer2>" ],
  "final_verdict": "Correct" | "Incorrect" | "Ambiguous"
}

Question: ${question.text}
Answers: ${question.answers.map(a => a.text).join(", ")}
Correct Answer: ${question.correct_answer}
Explanation: ${question.explanation || "N/A"}
  `.trim();

  try {
    const response = await axios.post(OLLAMA_URL, {
      model: "llama3",
      prompt,
      options: {
        num_ctx: 4096,
        temperature: 0.0,
        top_p: 0.9,
        top_k: 40,
        min_p: 0.05,
        repeat_penalty: 1.1,
        repeat_last_n: 64,
        num_predict: 300
      },
      stream: false
    });

    const raw = response.data.response.trim();
    let parsed = JSON.parse(raw);

    if (
      parsed.is_correct_answer_valid === undefined ||
      !parsed.correct_answer_reasoning ||
      parsed.explanation_consistent === undefined ||
      !parsed.explanation_reasoning ||
      !parsed.final_verdict
    ) {
      throw new Error("Invalid response format");
    }

    return parsed;
  } catch (err) {
    console.error("❌ Validation failed for question:", question._id, err.message);
    return null;
  }
}

async function validateAllCategories() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Only pull categories where at least one question has no validation
    const categories = await Category.find(
      { "questions.validation": { $exists: false } }, // only categories with unvalidated questions
      { name: 1, questions: 1 }
    ).limit(10);

       // 2️⃣ Reorder list so preferred category is first
if (preferredCategory) {

  // 1️⃣ Load ALL categories (only name + questions for speed)
  let categories = await Category.find({}, { name: 1, questions: 1 }).lean();

  // 2️⃣ Reorder list so keyword-matching categories come first
  if (preferredCategory) {
    const keyword = preferredCategory.toLowerCase();
    const matched = categories.filter((c) =>
      c.name.toLowerCase().includes(keyword)
    );
    const others = categories.filter(
      (c) => !c.name.toLowerCase().includes(keyword)
    );

    if (matched.length > 0) {
      categories = [...matched, ...others];
      console.log(
        `🟢 Starting with categories containing "${preferredCategory}" (${matched.length} matches)`
      );
    } else {
      console.log(
        `⚠️ No categories matched keyword "${preferredCategory}", continuing with all`
      );
    }
  }
}


    for (const category of categories) {
      console.log(`🔹 Validating category: ${category.name} (${category.questions.length} questions)`);

      for (const question of category.questions) {
        const parsed = await validateQuestion(question);
        if (!parsed) continue;

        const shouldDisable =
          parsed.final_verdict === "Incorrect" ||
          parsed.final_verdict === "Ambiguous" ||
          parsed.explanation_consistent === false;

        // Update question inline inside category
        await Category.updateOne(
          { "questions._id": question._id },
          {
            $set: {
              "questions.$.validation": {
                is_correct_answer_valid: parsed.is_correct_answer_valid,
                correct_answer_reasoning: parsed.correct_answer_reasoning,
                explanation_consistent: parsed.explanation_consistent,
                explanation_reasoning: parsed.explanation_reasoning,
                other_answers_possible: parsed.other_answers_possible,
                final_verdict: parsed.final_verdict,
                validationVersion: 0.02
              },
              "questions.$.disabled": shouldDisable
            }
          }
        );

        console.log(
          `   ✅ Question ${question._id} updated | Verdict: ${parsed.final_verdict} | Disabled: ${shouldDisable}`
        );
      }
    }

    console.log("🎉 All categories validated!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error validating categories:", err.message);
    mongoose.connection.close();
  }
}

// Run
validateAllCategories();
