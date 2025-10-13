require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL;


async function validateQuestion(question) {
  const prompt = `
You are a strict trivia question validator.  
You must check logical correctness and consistency of the Q&A.

Checks to perform:
1. Assess whether the question itself is logically and factually coherent.
   Detect any false or misleading assumptions or simplifications implied by the question text, such as treating a plural or multi-valued fact as singular.
   A question must not imply that only one option exists when several are equally official or correct.
2. Verify that the "correct_answer" logically satisfies the question.
3. Check that the explanation is consistent with both the question and the correct_answer.
4. Identify any semantic mismatches (type, scope, category differences).
5. Determine if other answers could also satisfy the question.
6. Provide a final verdict based on correctness and consistency.

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
    const parsed = JSON.parse(raw);

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

    // Fetch all categories so we can know which ones were skipped
    const allCategories = await Category.find({}, { name: 1 });
    const allCategoryNames = allCategories.map(c => c.name);

    // Fetch only categories with unvalidated questions
    const categories = await Category.aggregate([
      {
        $project: {
          name: 1,
          questions: {
            $filter: {
              input: "$questions",
              as: "q",
              cond: {
                $and: [
                  // ✅ keep only NOT disabled
                  { $ne: ["$$q.disabled", true] },
                  // ✅ validation is missing, null, or version 0
                  {
                    $or: [
                      { $eq: ["$$q.validation", null] },
                      { $eq: ["$$q.validation.validationVersion", 0] },
                      { $not: { $ifNull: ["$$q.validation.validationVersion", false] } }
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      // ✅ remove categories with no matching questions
      {
        $match: {
          "questions.0": { $exists: true }
        }
      }
    ]);


    // Derive skipped category names
    const processedNames = categories.map(c => c.name);
    const skippedNames = allCategoryNames.filter(name => !processedNames.includes(name));

    if (skippedNames.length > 0) {
      console.log(`⚪ Skipped categories (all questions validated):`);
      skippedNames.forEach(name => console.log("   •", name));
    }

    if (categories.length === 0) {
      console.log("✅ No unvalidated questions found.");
      mongoose.connection.close();
      return;
    }

    console.log(`\n🔍 Found ${categories.length} categories with unvalidated questions.\n`);

    for (const category of categories) {
      console.log(`🔹 Validating category: ${category.name} (${category.questions.length} questions)`);

      for (const question of category.questions) {
        const parsed = await validateQuestion(question);
        if (!parsed) continue;

        const shouldDisable =
          parsed.final_verdict === "Incorrect" ||
          parsed.final_verdict === "Ambiguous" ||
          parsed.explanation_consistent === false;

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
                validationVersion: 0.03
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

    console.log("\n🎉 All categories validated!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error validating categories:", err.message);
    mongoose.connection.close();
  }
}

// Run
validateAllCategories();
