require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");
const {
  assertOllamaSetup,
  callOllamaForText,
} = require("../services/ollamaClient");

const CURRENT_VALIDATION_VERSION = 0.07; // ⬅️ bump version so questions get revalidated

try {
  assertOllamaSetup();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

function parseParallelLimit(args) {
  const aliases = ["--parallel", "--concurrency", "-p", "-n"];
  let rawValue = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const [key, inlineValue] = arg.split("=");

    if (!aliases.includes(key)) {
      continue;
    }

    rawValue = inlineValue ?? args[i + 1];
    break;
  }

  if (rawValue == null) {
    return 1;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    console.warn(`Invalid parallel limit '${rawValue}'. Falling back to 1.`);
    return 1;
  }

  return parsedValue;
}

async function processInParallelBatches(items, concurrency, worker) {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map((item) => worker(item)));
    results
      .filter((result) => result.status === "rejected")
      .forEach((result) => {
        console.error("Error processing validation batch item:", result.reason?.message ?? result.reason);
      });
  }
}

// ----- Low-level helper -----
async function callOllama(prompt) {
  return callOllamaForText({
    prompt: `${prompt}\n\nSTRICT FORMAT: Respond with exactly one JSON object only. Do not output <think> tags, markdown, or any prose before/after JSON.`,
    presetName: "validateQuestions",
  });
}

function extractJson(text) {
  if (!text) return null;

  let clean = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^<think>[\s\S]*?(?=\{)/i, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^Here.*?:/i, "")
    .trim();

  const firstBrace = clean.indexOf("{");
  if (firstBrace > 0) {
    clean = clean.slice(firstBrace);
  }

  // Fast path: response is already a pure JSON object.
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Fall through to object extraction.
  }

  const starts = [];
  for (let i = 0; i < clean.length; i += 1) {
    if (clean[i] === "{") starts.push(i);
  }

  for (const start of starts) {
    let depth = 0;
    for (let end = start; end < clean.length; end += 1) {
      const ch = clean[end];
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          const candidate = clean.slice(start, end + 1);
          try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === "object") return parsed;
          } catch {
            // keep scanning
          }
          break;
        }
      }
    }
  }

  return null;
}

async function runPrompt(prompt, label, questionId) {
  try {
    const raw = await callOllama(prompt);
    const parsed = extractJson(raw);

    if (!parsed) {
      console.error(`❌ [${label}] Invalid JSON for question ${questionId}. Raw snippet:`, raw.slice(0, 300));
      return null;
    }

    return parsed;
  } catch (err) {
    console.error(`❌ [${label}] Error for question ${questionId}:`, err.message);
    return null;
  }
}

// ----- Prompt builders -----

function buildDomainPrompt(question) {
  return `
Classify the trivia question domain.

Domains with *one authoritative official answer* (TRUE):
- professional certifications (e.g., CCSP, CISSP),
- exams with fixed durations or score thresholds,
- biology facts (e.g., number of bones in the human body),
- geography facts (e.g., capital cities),
- historical dates/events,
- scientific constants or definitions,
- standardized specs (e.g., official units, ISO standards),
- legal definitions.

If the answer is standardized worldwide or by an official body → TRUE.

Return ONLY strict JSON (no extra text):

{
  "has_authoritative_answer": true|false,
  "domain": "<short domain>"
}

Question: ${question.text}
Correct Answer: ${question.correct_answer}
`.trim();
}

function buildPrimaryPrompt(question, authoritative) {
  return `
You are a *formal trivia question validator*.

Your task is to determine if a trivia question’s "correct answer" and "explanation" are factual, self-consistent, and appropriately specific.

IMPORTANT:
- Authoritative Domain = ${authoritative}
- If Authoritative Domain is true (e.g., certifications, standardized facts), then the question is expected to have ONE official correct answer defined by some authority.
- In authoritative domains, words like "typical", "usually", "generally" or "commonly" usually refer to that official standard and do NOT automatically make the question ambiguous.

Rules:

1) FACT CHECK
- Evaluate whether the provided "correct answer" matches real-world knowledge.
- If it is factually false, mark final_verdict = "Incorrect".

2) INTERNAL CONSISTENCY
- If the explanation disagrees with the answer → "Incorrect".
- If the explanation does not clearly justify the correct answer → "Ambiguous".
- If the explanation supports the answer → continue.

3) MULTIPLE VALID ANSWERS
- If Authoritative Domain = true:
  - Only treat as "Ambiguous" if there are genuinely multiple officially recognized correct answers.
- If Authoritative Domain = false:
  - If the question naturally allows several different correct answers (e.g. "a reason", "a popular X", "a city known for..."), you may mark "Ambiguous".

4) FINAL DECISION
- Factual answer wrong → "Incorrect".
- Explanation contradicts answer → "Incorrect".
- Multiple plausible answers (non-authoritative domain) → "Ambiguous".
- Explanation vague/partial but not clearly wrong → "Ambiguous".
- Everything factually correct and well supported → "Correct".

Return ONLY valid JSON, no markdown, no prose:

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
}

function buildCriticPrompt(question, authoritative) {
  return `
Act as a *strict but factual* adversarial critic of a trivia question.

Your job is to try to find issues with the given correct answer, but you MUST obey these constraints:

- DO NOT invent alternative answers.
- Only list alternative_answers if they are official, factual, and widely recognized as valid answers to this specific question.
- If you are uncertain about an alternative, DO NOT include it.
- If Authoritative Domain = true, alternative official answers should be extremely rare.

Return ONLY strict JSON:

{
  "has_issue": true|false,
  "issue_type": "Incorrect" | "Ambiguous" | "None",
  "reasons": "<describe the strongest issues you find, or 'None'>",
  "alternative_answers": ["<alt1>", "<alt2>"]
}

Authoritative Domain: ${authoritative}

Question: ${question.text}
Correct Answer: ${question.correct_answer}
Explanation: ${question.explanation || "N/A"}
`.trim();
}

function buildIndependentPrompt(question, authoritative) {
  return `
You are performing a factual check of a trivia question.

IMPORTANT:
- Ignore the explanation completely. Do NOT rely on it for facts.
- Consider only the question text and the provided correct answer.
- If Authoritative Domain = true, expect a single official correct answer.
- DO NOT hallucinate ranges or alternative answers unless they are truly official, widely accepted factual alternatives.

Return ONLY strict JSON:

{
  "is_factually_correct": true|false,
  "alternative_correct_answers": ["<alt1>", "<alt2>"],
  "reasons": "<short factual justification>",
  "verdict": "Correct" | "Incorrect" | "Ambiguous"
}

Authoritative Domain: ${authoritative}

Question: ${question.text}
Correct Answer: ${question.correct_answer}
`.trim();
}

// ----- Multi-pass validator (domain-aware, lenient) -----
async function validateQuestion(question) {
  try {
    // 1) Domain classification
    const domainPrompt = buildDomainPrompt(question);
    const domain = await runPrompt(domainPrompt, "DOMAIN", question._id);
    const authoritative = domain?.has_authoritative_answer === true;

    // 2) Primary evaluation
    const primaryPrompt = buildPrimaryPrompt(question, authoritative);
    const primary = await runPrompt(primaryPrompt, "PRIMARY", question._id);
    if (!primary) {
      throw new Error("Primary validation failed");
    }

    // 3) Critic
    const criticPrompt = buildCriticPrompt(question, authoritative);
    const critic = await runPrompt(criticPrompt, "CRITIC", question._id);

    // 4) Independent fact check
    const independentPrompt = buildIndependentPrompt(question, authoritative);
    const independent = await runPrompt(independentPrompt, "INDEPENDENT", question._id);

    // ----- Aggregate results -----
    let finalVerdict = primary.final_verdict || "Ambiguous";
    let isCorrectAnswerValid = !!primary.is_correct_answer_valid;
    let explanationConsistent = !!primary.explanation_consistent;

    const otherAnswers = new Set();
    if (Array.isArray(primary.other_answers_possible)) {
      primary.other_answers_possible.forEach((a) => otherAnswers.add(a));
    }

    // Merge critic
    if (critic) {
      if (Array.isArray(critic.alternative_answers)) {
        critic.alternative_answers.forEach((a) => otherAnswers.add(a));
      }

      if (critic.has_issue && critic.issue_type && critic.issue_type !== "None") {
        if (critic.issue_type === "Incorrect") {
          finalVerdict = "Incorrect";
          isCorrectAnswerValid = false;
        } else if (critic.issue_type === "Ambiguous" && finalVerdict === "Correct") {
          // lenient mode: allow Ambiguous (we do NOT treat as Incorrect here)
          finalVerdict = "Ambiguous";
        }
      }
    }

    // Merge independent fact check
    if (independent) {
      if (!independent.is_factually_correct) {
        finalVerdict = "Incorrect";
        isCorrectAnswerValid = false;
      } else {
        const hasAlt =
          Array.isArray(independent.alternative_correct_answers) &&
          independent.alternative_correct_answers.length > 0;

        // Only downgrade to Ambiguous for non-authoritative domains
        if (hasAlt && !authoritative && finalVerdict === "Correct") {
          finalVerdict = "Ambiguous";
          independent.alternative_correct_answers.forEach((a) => otherAnswers.add(a));
        }
      }
    }

    const mergedCorrectReasoning = [
      primary.correct_answer_reasoning,
      critic?.reasons ? `Critic: ${critic.reasons}` : "",
      independent?.reasons ? `Independent: ${independent.reasons}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const mergedExplanationReasoning =
      primary.explanation_reasoning || "Based on primary evaluation.";

    return {
      is_correct_answer_valid: isCorrectAnswerValid,
      correct_answer_reasoning: mergedCorrectReasoning,
      explanation_consistent: explanationConsistent,
      explanation_reasoning: mergedExplanationReasoning,
      other_answers_possible: Array.from(otherAnswers),
      final_verdict: finalVerdict,
    };
  } catch (err) {
    console.error("❌ Validation failed for question:", question._id, err.message);
    return null;
  }
}

module.exports = {
  validateQuestion,
};

// ----- Bulk category validation -----
async function validateAllCategories() {
  try {
    const parallelLimit = parseParallelLimit(process.argv.slice(2));

    await connectDB();
    console.log("✅ Connected to MongoDB");

    console.log(`Running question validations with parallel limit: ${parallelLimit}`);

    // Fetch all categories so we can know which ones were skipped
    const allCategories = await Category.find({}, { name: 1 });
    const allCategoryNames = allCategories.map((c) => c.name);

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
                  // Keep only NOT disabled
                  { $ne: ["$$q.disabled", true] },
                  // validation missing, null, or older than current version
                  {
                    $or: [
                      { $eq: ["$$q.validation", null] },
                      { $eq: ["$$q.validation.validationVersion", null] },
                      { $lt: ["$$q.validation.validationVersion", CURRENT_VALIDATION_VERSION] },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          "questions.0": { $exists: true },
        },
      },
    ]);

    const processedNames = categories.map((c) => c.name);
    const skippedNames = allCategoryNames.filter((name) => !processedNames.includes(name));

    if (skippedNames.length > 0) {
      console.log(`⚪ Skipped categories (all questions validated):`);
      skippedNames.forEach((name) => console.log("   •", name));
    }

    if (categories.length === 0) {
      console.log("✅ No unvalidated questions found.");
      mongoose.connection.close();
      return;
    }

    console.log(`\n🔍 Found ${categories.length} categories with unvalidated questions.\n`);

    for (const category of categories) {
      console.log(`🔹 Validating category: ${category.name} (${category.questions.length} questions)`);

      await processInParallelBatches(category.questions, parallelLimit, async (question) => {
        const parsed = await validateQuestion(question);
        if (!parsed) return;

        // LENIENT MODE:
        // ❌ Incorrect → disable
        // ⚠️ Ambiguous → keep
        // ❗ But if explanation is inconsistent → disable
        const shouldDisable =
          parsed.final_verdict === "Incorrect" ||
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
                validationVersion: CURRENT_VALIDATION_VERSION,
              },
              "questions.$.disabled": shouldDisable,
            },
          }
        );

        console.log(
          `   ✅ Question ${question._id} updated | Verdict: ${parsed.final_verdict} | Disabled: ${shouldDisable}`
        );

        // 🔥 Log detailed info only if disabled
        if (shouldDisable) {
          console.log("\n❌ DISABLED QUESTION DETAILS ❌");
          console.log("------------------------------------------------------");
          console.log(`🆔 Question ID: ${question._id}`);
          console.log(`📌 Text: ${question.text}`);
          console.log("📝 Answers:");
          question.answers.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.text}`);
          });
          console.log(`✔ Correct Answer: ${question.correct_answer}`);
          console.log(`💬 Explanation: ${question.explanation || "(none)"}`);
          console.log("\n🔍 VALIDATION DETAILS:");
          console.log(`- Final Verdict: ${parsed.final_verdict}`);
          console.log(`- is_correct_answer_valid: ${parsed.is_correct_answer_valid}`);
          console.log(`- explanation_consistent: ${parsed.explanation_consistent}`);
          console.log(`- Reasoning: ${parsed.correct_answer_reasoning}`);
          console.log("------------------------------------------------------\n");
        }

      });
    }

    console.log("\n🎉 All categories validated!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error validating categories:", err.message);
    mongoose.connection.close();
  }
}

// Run as script
validateAllCategories();
