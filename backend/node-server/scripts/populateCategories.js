require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const crypto = require("crypto");
const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL;
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

async function fetchQuestions(categoryName, difficultyHint = "") {

    console.log(`🔹 Generating for category: "${categoryName}" from ollama`);

    const difficultySection = difficultyHint
  ? `\nDifficulty requested: ${difficultyHint}. Generate the question at this difficulty.\n`
  : "";

    const avoidSection = avoidedQuestions.length > 0
        ? `Do NOT generate any of these questions (nor semantically similar ones):
        \n${avoidedQuestions.map(q => `- ${q}`).join("\n")}\n\n
        `
        : "";

const systemPrompt = `
You are an international trivia expert. Use metric units, global examples, and neutral English spelling.”
Output STRICT JSON only (no prose, no markdown)

=== GENERAL RULES ===
- Use real, verifiable facts. Do NOT fabricate.
- Question must have exactly 4 distinct answer choices; exactly 1 correct.
- Do NOT generate questions based on cultural epithets, nicknames, myths, legends, symbolism, allegories, idioms, or metaphorical associations.
- Only generate questions grounded in factual, observable, or academically verifiable information.
- Exclude any content that relies on folklore, religion, or interpretive traditions rather than established fact.
- Avoid ambiguous or subjective wording.
- Correct answer MUST be one of the provided answers.
- Provide a concise explanation (1–2 sentences) in plain language that restates the fact from source_quote. This field must never be empty.
- Provide a difficulty_rationale that explains why the fact fits the chosen difficulty level. This field must never be empty.
- Sources: use reputable domains only (britannica.com, nasa.gov, who.int, smithsonianmag.com, etc.).
- Each output must include: question, answers, correct_answer, explanation, source_domain, source_title, source_quote, difficulty_level, difficulty_rationale.
- You must deeply understand the category’s full meaning, not just individual words.
- Use the category as a thematic context for the question, not as a literal keyword.

== Before generating the question ==
- Interpret what the category *represents conceptually* (e.g., field, subject, or theme).
- Generate a factual, verifiable, non-ambiguous question clearly connected to that concept.

=== DIFFICULTY RUBRIC (1–10) ===
1–2: Very basic factual recall (e.g., color of a fruit, number of continents).
3–4: Simple but slightly more detailed factual recall (e.g., main ingredient of a dish, country location of a city).
5–6: Intermediate factual knowledge requiring some learning or context (e.g., name of a river’s source, year of an invention).
7–8: Advanced factual knowledge often covered in higher studies (e.g., lesser-known historical treaties, specific scientific terms).
9–10: Highly specialized or expert-level factual knowledge (e.g., detailed scientific classification, rare historical events).


COUPLING RULES:
- Difficulty level = based on how specific and specialized the fact is, not on how “well-known” it is.
- Always express the fact directly, without commentary on whether it is famous, common, or obscure.

=== OUTPUT FORMAT ===
{
  "question": string,
  "answers": [string, string, string, string],
  "correct_answer": string,
  "explanation": string,
  "source_domain": string,
  "source_title": string,
  "source_quote": string,
  "difficulty_level": integer,
  "difficulty_rationale": string
}

If any requirement fails, output {}.

Interpret the category as a single unified topic or concept, not as separate words. 
Infer its most likely subject area.
Then generate ONE factual quiz question clearly about that concept.

Category: ${categoryName}
${avoidSection}
${difficultySection}
`;


//${avoidSection} //For now to see if it stop generating very similar questions

//console.log(`🔹Prompt ${systemPrompt}`);

 try {
    const res = await axios.post(OLLAMA_URL, {
      model: "llama3",
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

async function populateCategoryLoop(categoryId, iterations, difficultyHint = "") {
    try {
        for (let i = 0; i < iterations; i++) {
            console.log(`\n🔄 Iteration ${i + 1}/${iterations} for category ${categoryId}`);
            await populateCategory(categoryId, difficultyHint);
        }
    } finally {
        avoidedQuestions.length = 0;
        console.log("🧹 Cleared avoided questions list after loop.");
    }
}

async function populateCategory(categoryId, difficultyHint = "") {
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

        console.log(`🔹 ${category.name}: ${nonDisabledCount} questions. Fetching a ${difficultyHint} one.`);

        const fetchedQuestions = await fetchQuestions(category.name, difficultyHint);
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
                    version: 1.04
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
