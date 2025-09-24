require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const crypto = require("crypto");
const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://ollama-container:11440/api/generate";
const avoidedQuestions = [];

if (!OLLAMA_URL) {
    console.error("❌ OLLAMA_URL is not set! Please set it in your environment variables.");
    process.exit(1);
}

console.log(`🚀 Ollama API set to: ${OLLAMA_URL}`);

// Generate a unique hash for each question
const generateQuestionHash = (questionText) => {
    return crypto.createHash("sha256").update(questionText).digest("hex");
};

async function fetchQuestions(categoryName) {

    console.log(`🔹 Generating for category: "${categoryName}" from ollama`);

    const avoidSection = avoidedQuestions.length > 0
        ? `Do NOT generate any of these questions (nor semantically similar ones):
        \n${avoidedQuestions.map(q => `- ${q}`).join("\n")}\n\n
        `
        : "";

    const systemPrompt = `
You are an AI Quiz Generator. Output STRICT JSON only (no prose, no markdown).

RUBRIC for "difficulty_level" (integer 1–10):
1–2 Very Easy: universally known, primary-school facts.
3–4 Easy: commonly taught basics.
5–6 Moderate: regional specifics, niche-but-accessible details.
7–8 Hard: specialized knowledge, advanced concepts, enthusiast-level facts.
9–10 Very Hard: highly obscure, expert/scholarly facts.

COUPLING RULES:
- If difficulty_rationale uses any of: "specialized", "niche", "expert", "obscure", assign ≥7.
- If rationale says "universally known" or "commonly taught", assign ≤4.
- If uncertain between two adjacent levels, choose the higher.

SOURCES (no URLs to avoid dead links):
- Provide a reputable source_domain (e.g., britannica.com, nobelprize.org, nasa.gov, who.int, worldbank.org, un.org, loc.gov, census.gov, oecd.org, imf.org, smithsonianmag.com, ecdc.europa.eu).
- Provide a source_title (exact page/article title) and a source_quote (≤20 words verbatim) supporting the key fact.
- If you cannot provide these fields credibly, output {}.

REQUIREMENTS:
- Use real, verifiable facts. Do NOT fabricate.
- Exactly 4 distinct answer choices; exactly 1 correct (single-correct MCQ).
- Avoid questions where multiple choices could be correct; if unavoidable, output {}.
- Explanation must mention the same key fact as the source_quote.
- "difficulty_level" MUST be one of [1,2,3,4,5,6,7,8,9,10].
- Provide difficulty_rationale (5–20 words) consistent with the rubric.

SELF-CHECK (must pass all, or output {}):
- correct_answer is one of answers.
- answers are all unique (case-insensitive).
- The question is unambiguous (only one correct choice).
- source_domain is from the allowed list above.
- source_quote directly supports the explanation’s key fact.

OUTPUT (object only):
{
  "question": string,
  "answers": [string, string, string, string],
  "correct_answer": string,
  "explanation": string,
  "source_domain": string,      // e.g., "britannica.com"
  "source_title": string,       // page/article title
  "source_quote": string,       // ≤20 words verbatim
  "difficulty_level": integer,
  "difficulty_rationale": string
}

If any requirement fails, output {}.

Category: ${categoryName}. Generate ONE question.

${avoidSection}
`;

//console.log(`🔹Prompt ${systemPrompt}`);

 try {
    const res = await axios.post(OLLAMA_URL, {
      model: "mistral",
      format: "json",
      prompt: systemPrompt,
      stream: false,
      options: {
        num_ctx: 4096,
        num_keep: 200,
        temperature: 0.2,
        top_p: 0.7,
        top_k: 5,
        min_p: 0.1,
        repeat_penalty: 1.15,
        repeat_last_n: 128,
        num_predict: 512
      }
    }, { timeout: 240_000 });

    if (!res.data || !res.data.response) {
      throw new Error("❌ Ollama response missing 'response' field.");
    }

    let rawResponse = String(res.data.response).trim();
    
    // Try to parse JSON directly
    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      // fallback cleanup for quotes/markdown fences
      rawResponse = rawResponse
        .replace(/```(\w+)?/g, "")
        .replace(/\u201C|\u201D/g, '"')
        .replace(/\u2019/g, "'");
      parsed = JSON.parse(rawResponse);
    }

    const question = normalizeQuestion(parsed);
    //console.log(`✅ Parsed question: ${JSON.stringify(question)}`);

    return [question]; // still return as array so populateCategory works

  } catch (error) {
    console.error("⚠️ Error fetching question from Ollama:");
    if (error.response) {
      console.error(`❌ HTTP ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error("❌ No response from Ollama.");
    } else {
      console.error("❌ Request error:", error.message);
    }
    return [];
  }
}

function normalizeQuestion(q) {
  const difficulty = Number(q.difficulty ?? q.difficulty_level ?? 5);
  return {
    question: q.question ?? "",
    answers: Array.isArray(q.answers) ? q.answers.slice(0, 4) : [],
    correct_answer: q.correct_answer ?? "",
    explanation: q.explanation ?? "",
    source_domain: q.source_domain ?? "",
    source_title: q.source_title ?? "",
    source_quote: q.source_quote ?? "",
    difficulty_level: Number.isFinite(difficulty)
      ? Math.max(1, Math.min(10, Math.round(difficulty)))
      : 5,
    difficulty_rationale: q.difficulty_rationale ?? ""
  };
}

async function populateCategoryLoop(categoryId, iterations) {
    try {
        for (let i = 0; i < iterations; i++) {
            console.log(`\n🔄 Iteration ${i + 1}/${iterations} for category ${categoryId}`);
            await populateCategory(categoryId, 1);
        }
    } finally {
        avoidedQuestions.length = 0;
        console.log("🧹 Cleared avoided questions list after loop.");
    }
}

async function populateCategory(categoryId, numQuestions) {
    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            console.error(`❌ Category not found: ${categoryId}`);
            return;
        }

        const nonDisabledCount = category.questions.filter(q => !q.disabled).length;

        if (nonDisabledCount >= 100) {
            console.log(`🚫 Skipping ${category.name} (already has ${nonDisabledCount} questions).`);
            return;
        }

        console.log(`🔹 ${category.name}: ${nonDisabledCount} questions. Fetching ${numQuestions} more.`);

        const fetchedQuestions = await fetchQuestions(category.name, numQuestions);
        let newQuestionsAdded = 0;

        try {
            fetchedQuestions.forEach(q => {
                const questionHash = generateQuestionHash(q.question);

                avoidedQuestions.push(q.question);

                if (category.questions.some(q => q.hash === questionHash)) {
                    console.log(`⚠️ Duplicate skipped: ${q.question}`);
                    return;
                }

                if (!q.answers.includes(q.correct_answer)) {
                    console.error("❌ No correct answer, skipping...");
                    return;
                    console.log(`Fixed missing correct answer for question: ${q.question}`);
                    q.answers[Math.floor(Math.random() * q.answers.length)] = q.correct_answer;
                }

                const newQuestion = {
                    _id: new mongoose.Types.ObjectId(),
                    text: q.question,
                    answers: q.answers.map(answer => ({ text: answer, correctCount: 0, incorrectCount: 0 })),
                    correct_answer: q.correct_answer,
                    explanation: q.explanation,
                    source_domain: q.source_domain,
                    source_title: q.source_title,
                    source_quote: q.source_quote,
                    difficulty_level: q.difficulty_level,
                    difficulty_rationale: q.difficulty_rationale,
                    timesLoaded: 0,
                    popularity: 0,
                    disabled: false,
                    timesAnsweredCorrectly: 0,
                    timesAnsweredIncorrectly: 0,
                    hash: questionHash,
                    version: 0.15
                };

                category.questions.push(newQuestion);
                newQuestionsAdded++;
            });
        } catch (error) {
            console.error("❌ Error fetching question:", error.message);
            console.error(`❌ Raw Response: ${JSON.stringify(fetchedQuestions)}`)
        }

        if (newQuestionsAdded > 0) {
            category.disabled = false;
            await category.save();
            console.log(`✅ Added ${newQuestionsAdded} questions to ${category.name}.`);
        }

    } catch (error) {
        console.error("❌ Error populating category:", error.message);
    }
}

module.exports = { populateCategory, populateCategoryLoop };
