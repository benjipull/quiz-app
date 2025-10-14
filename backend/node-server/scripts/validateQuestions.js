require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL;
const CURRENT_VALIDATION_VERSION = 0.05;

async function validateQuestion(question) {
  const prompt = `
You are a *formal trivia question validator*.  
Your job is to determine whether this question has **exactly one uniquely correct answer**.

---

### STEP 1. Identify linguistic vagueness
If the question contains phrases such as:
- "a key", "a main", "one of", "commonly used", "an example of", "typically", or "usually"
→ These imply that *multiple answers* might be correct.  
If any such phrase appears **and** more than one listed answer fits the description, mark it as **Ambiguous**.

### STEP 2. Test all options logically
For each provided answer:
- Ask: “Could this reasonably be considered correct or partially correct according to common factual knowledge?”
- Count how many are valid.
  - If more than one answer could be considered correct, list them under "other_answers_possible" and classify as **Ambiguous**.
  - If the marked correct answer is factually wrong, classify as **Incorrect**.
  - If exactly one answer fits perfectly and others clearly do not, classify as **Correct**.

### STEP 3. Examine the explanation
- If the explanation lists *multiple items* that align with different answer options (e.g., "made with cream, sugar, and eggs"), this implies multiple answers could be right → **Ambiguous**.
- If the explanation does not directly justify the correct answer or is too broad, also **Ambiguous**.
- If the explanation contradicts the correct answer, **Incorrect**.

### STEP 4. Decide final verdict
- "Correct": one unique valid answer, well-justified.
- "Ambiguous": multiple plausible answers, vague wording, or multi-item explanation.
- "Incorrect": correct_answer is factually wrong.

---

Return STRICT JSON ONLY:
{
  "is_correct_answer_valid": true|false,
  "correct_answer_reasoning": "<why correct or not>",
  "explanation_consistent": true|false,
  "explanation_reasoning": "<why consistent or not>",
  "other_answers_possible": ["<answer1>", "<answer2>"],
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
        top_p: 1.0,
        top_k: 0,
        repeat_penalty: 1.1,
        repeat_last_n: 64,
        num_predict: 600
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
                  // ✅ Keep only NOT disabled
                  { $ne: ["$$q.disabled", true] },
                  // ✅ validation missing, null, or older than current version
                  {
                    $or: [
                      // No validation object at all
                      { $eq: ["$$q.validation", null] },
                      // validationVersion field missing or null
                      { $eq: ["$$q.validation.validationVersion", null] },
                      // validationVersion strictly less than current version
                      { $lt: ["$$q.validation.validationVersion", CURRENT_VALIDATION_VERSION] }
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
                validationVersion: CURRENT_VALIDATION_VERSION
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
