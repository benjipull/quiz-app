require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const crypto = require("crypto");
const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://ollama-container:11440/api/generate";

if (!OLLAMA_URL) {
    console.error("❌ OLLAMA_URL is not set! Please set it in your environment variables.");
    process.exit(1);
}

console.log(`🚀 Ollama API set to: ${OLLAMA_URL}`);

// ✅ Generate a unique hash for each question
const generateQuestionHash = (questionText) => {
    return crypto.createHash("sha256").update(questionText).digest("hex");
};

// ✅ Fetch questions from Ollama with detailed logging
async function fetchQuestions(categoryName, numQuestions) {
    console.log(`Generating for category: "${categoryName}" from ollama`);

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
`;


    try {
        const res = await axios.post(OLLAMA_URL, {
        model: "mistral",
        format: "json",
        prompt: systemPrompt,
        stream: false,
        options: {
            temperature: 0.2,
            top_p: 0.9, // nucleus sampling, avoids weird rare tokens
            top_k: 40, // reasonable diversity cut-off
            num_predict: 220, // enough tokens for full JSON answer
            repeat_penalty: 1.1, // soft penalty against repeating tokens
            repeat_last_n: 64 // memory window for penalty
        }
        }, { timeout: 240_000 });

        if (!res.data || !res.data.response) {
            throw new Error("❌ Ollama response missing 'response' field.");
        }

        // 1) Fast path: try direct parse (format:json should make this work)
        let rawResponse = String(res.data.response).trim();

        // 1) Try direct parse
        let parsed;
        try {
            parsed = JSON.parse(rawResponse);
        } catch {
            // 2) Cleanup and try again
            rawResponse = rawResponse
                .replace(/```(\w+)?/g, "") // remove ``` and ```json
                .replace(/\u201C|\u201D/g, '"') // smart quotes -> "
                .replace(/\u2019/g, "'"); // curly apostrophe -> '

        try {
            parsed = JSON.parse(rawResponse);
        } catch {
            // 3) Last resort: slice the first JSON array if present
            if (rawResponse.includes("[")) {
                const sliced = extractFirstJsonArray(rawResponse);
                parsed = JSON.parse(sliced);
            } else {
                throw new Error(`❌ Unable to parse JSON.\nRAW:\n${rawResponse}`);
            }
        }
        }

        // ✅ Normalize into an array (handles object or { data: [...] })
        let items = [];
        if (Array.isArray(parsed)) {
            items = parsed;
        } else if (parsed && typeof parsed === "object") {
            if (Array.isArray(parsed.data)) {
                items = parsed.data;
            } else {
                items = [parsed]; // single object case
            }
        } else if (typeof parsed === "string") {
        // rare case: JSON string containing the array/object
        try {
            const again = JSON.parse(parsed);
            items = Array.isArray(again) ? again : [again];
        } catch {
            console.error("RAW Ollama response (string):", rawResponse);
            throw new Error(`❌ Not a JSON array or object: ${JSON.stringify(parsed)}`);
        }
        } else {
            console.error("RAW Ollama response (unhandled):", rawResponse);
            throw new Error(`❌ Not a JSON array: ${JSON.stringify(parsed, null, 2)}`);
        }

        const questions = items.map(normalizeQuestion);

        console.log(`Successfully parsed ${questions.length} questions from Ollama.`);


        //Self-verify each question - to remove
        const verifiedQuestions = [];
        for (const question of questions) {
            const isValid = true; //= await verifyQuestion(question); //Disabled for now
            if (isValid) {
                verifiedQuestions.push(question);
            } else {
                console.log(`❌ Discarding hallucinated question: "${question.question}"`);
            }
        }

        return verifiedQuestions;

    } catch (error) {
        console.error("⚠️ Error fetching questions from Ollama:");
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

// --- helpers ---
function extractFirstJsonArray(s) {
  const start = s.indexOf('[');
  if (start === -1) throw new Error(`❌ No '[' found.\nRaw: ${s}`);
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  throw new Error(`❌ Unterminated JSON array.\nRaw: ${s}`);
}

function normalizeQuestion(q) {
  // unify field naming and types
  const difficulty = Number(q.difficulty ?? q.difficulty_level ?? 5);
  return {
    question: q.question ?? "",
    answers: Array.isArray(q.answers) ? q.answers.slice(0, 4) : [],
    correct_answer: q.correct_answer ?? "",
    explanation: q.explanation ?? "",
    source: q.source ?? "",
    difficulty_level: Number.isFinite(difficulty) ? Math.max(1, Math.min(10, Math.round(difficulty))) : 5,
    difficulty_rationale: q.difficulty_rationale ?? ""
  };
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

        fetchedQuestions.forEach(q => {
            const questionHash = generateQuestionHash(q.question);

            if (category.questions.some(q => q.hash === questionHash)) {
                console.log(`⚠️ Duplicate skipped: ${q.question}`);
                return;
            }

            if (!q.answers.includes(q.correct_answer)) {
                console.log(`Fixed missing correct answer for question: ${q.question}`);
                q.answers[Math.floor(Math.random() * q.answers.length)] = q.correct_answer;
            }

            const newQuestion = {
                _id: new mongoose.Types.ObjectId(),
                text: q.question,
                answers: q.answers.map(answer => ({ text: answer, correctCount: 0, incorrectCount: 0 })),
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                difficulty_level: q.difficulty_level,
                difficulty_rationale: q.difficulty_rationale,
                timesLoaded: 0,
                popularity: 0,
                disabled: false,
                timesAnsweredCorrectly: 0,
                timesAnsweredIncorrectly: 0,
                hash: questionHash,
                version: 0.12
            };

            category.questions.push(newQuestion);
            newQuestionsAdded++;
        });

        if (newQuestionsAdded > 0) {
            category.disabled = false;
            await category.save();
            console.log(`✅ Added ${newQuestionsAdded} questions to ${category.name}.`);
        }

    } catch (error) {
        console.error("❌ Error populating category:", error.message);
    }
}

module.exports = { populateCategory };
