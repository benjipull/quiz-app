require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL;
const CURRENT_VALIDATION_VERSION = 0.06;

async function validateQuestion(question) {
  const prompt = `
You are a *formal trivia question validator*.

Your task is to determine if a trivia question’s "correct answer" and "explanation" are **factual, self-consistent, and unambiguous**.

---

## 1️⃣ FACT CHECK
- Evaluate whether the provided "correct answer" (A_correct) matches real-world knowledge.
- If it is factually false, mark **Incorrect**.

Example:
Q: What is the average number of lives a cat has?
A_correct: 3
Explanation: "Cats have nine lives..."
→ Verdict: Incorrect — explanation and factual knowledge contradict the given correct answer.

---

## 2️⃣ INTERNAL CONSISTENCY
Compare the explanation and the correct answer:
- If the explanation **disagrees** with the answer → "Incorrect"
- If the explanation **does not clearly justify** the correct answer → "Ambiguous"
- If the explanation **directly supports** the correct answer → continue

---

## 3️⃣ MULTIPLE VALID ANSWERS
- If the question allows for more than one possible valid answer, mark **Ambiguous**
(e.g., contains words like “a”, “one of”, “commonly”, “typically”, etc.)

---

## 4️⃣ FINAL DECISION RULES
| Case | Verdict | Description |
|------|----------|--------------|
| Factual answer wrong | Incorrect | The “correct answer” is not factually true |
| Explanation contradicts answer | Incorrect | Internal mismatch |
| Multiple plausible answers | Ambiguous | More than one possible correct answer |
| Explanation vague or partial | Ambiguous | Not well-justified |
| Everything aligns factually and logically | Correct | ✅ Only one clear, factual answer |

---

Return ONLY valid JSON that starts with { and ends with } — no markdown, no explanations.

No markdown, no prose, no code fences.

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

  async function queryOllama() {
    const res = await axios.post(OLLAMA_URL, {
      model: "llama3",
      prompt,
      options: {
        temperature: 0.0,
        top_p: 0.85,
        top_k: 30,
        num_ctx: 2048,
        num_predict: 400,
        repeat_penalty: 1.15,
      },
      stream: false,
    });
    return res.data?.response || "";
  }

  function extractJson(text) {
    if (!text) return null;

    // Remove common wrappers
    let clean = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^Here.*?:/i, "")
      .trim();

    // Find the first {...} JSON block
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (err) {
      return null;
    }
  }

  try {
    let raw = (await queryOllama()).trim();
    let parsed = extractJson(raw);

    // 🔁 One retry if invalid JSON
    if (!parsed) {
      console.warn("⚠️ Retrying due to invalid JSON for:", question._id);
      await new Promise(r => setTimeout(r, 1000));
      raw = (await queryOllama()).trim();
      parsed = extractJson(raw);
    }

    if (!parsed) {
      console.error("❌ Still invalid JSON after retry. Raw snippet:", raw.slice(0, 400));
      throw new Error("Invalid response format");
    }

    // ✅ Structural validation
    const requiredFields = [
      "is_correct_answer_valid",
      "correct_answer_reasoning",
      "explanation_consistent",
      "explanation_reasoning",
      "final_verdict",
    ];
    for (const field of requiredFields) {
      if (parsed[field] === undefined || parsed[field] === null) {
        throw new Error(`Missing field: ${field}`);
      }
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
