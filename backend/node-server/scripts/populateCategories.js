require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Category = require("../models/categoryModel");
const crypto = require("crypto");
const axios = require("axios");

// ✅ Set Ollama URL explicitly via environment variable or default
const OLLAMA_URL = process.env.OLLAMA_URL || "https://c652-105-185-157-37.ngrok-free.app/api/generate";

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
    console.log(`🚀 Preparing to fetch ${numQuestions} questions for category: "${categoryName}"`);

    const systemPrompt = `
    You are an AI trivia generator. Your task is to generate **${numQuestions}** trivia questions related to **${categoryName}**.

    ### **Instructions:**
    - Generate **fact-based, objective trivia questions** about **${categoryName}**.
    - Each question must have **exactly 4 distinct answer choices**.
    - **The correct_answer MUST be one of the 4 choices in the answers array**.
    - Provide a **brief and accurate explanation** for why the correct answer is correct.
    - **The response MUST be a valid JSON array** with NO extra text.

    ### **Response Format:**
    [
        {
            "question": "What is the capital of France?",
            "answers": ["Berlin", "Madrid", "Paris", "Rome"],
            "correct_answer": "Paris",
            "explanation": "Paris is the capital city of France."
        }
    ]
    `;

    try {
        console.log(`🚀 Sending request to Ollama at: ${OLLAMA_URL}`);

        const response = await axios.post(OLLAMA_URL, {
            model: "mistral",
            prompt: systemPrompt,
            stream: false,
            max_tokens: 250 * numQuestions,
            temperature: 0.1
        });

        console.log("✅ Ollama response received:", response.data);

        if (!response.data || !response.data.response) {
            throw new Error("❌ Ollama response missing 'response' field.");
        }

        let questions;
        try {
            questions = JSON.parse(response.data.response.trim());
        } catch (jsonError) {
            throw new Error(`❌ JSON parse error: ${jsonError.message}\nRaw response: ${response.data.response}`);
        }

        if (!Array.isArray(questions)) {
            throw new Error("❌ Ollama response not a valid JSON array.");
        }

        console.log(`✅ Successfully parsed ${questions.length} questions from Ollama.`);
        return questions;

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

// ✅ Populate a single category with questions and detailed logging
async function populateCategory(categoryId, numQuestions = 20) {
    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            console.error(`❌ Category not found: ${categoryId}`);
            return;
        }

        const nonDisabledCount = category.questions.filter(q => !q.disabled).length;

        if (nonDisabledCount >= 200) {
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
                console.warn(`⚠️ Correct answer missing for question: ${q.question}`);
                q.answers[Math.floor(Math.random() * q.answers.length)] = q.correct_answer;
            }

            const newQuestion = {
                _id: new mongoose.Types.ObjectId(),
                text: q.question,
                answers: q.answers.map(answer => ({ text: answer, correctCount: 0, incorrectCount: 0 })),
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                timesLoaded: 0,
                popularity: 0,
                disabled: false,
                timesAnsweredCorrectly: 0,
                timesAnsweredIncorrectly: 0,
                hash: questionHash
            };

            category.questions.push(newQuestion);
            newQuestionsAdded++;
        });

        if (newQuestionsAdded > 0) {
            category.disabled = false;
            await category.save();
            console.log(`✅ Added ${newQuestionsAdded} questions to ${category.name}.`);
        } else {
            console.log(`ℹ️ No new questions added to ${category.name}.`);
        }

    } catch (error) {
        console.error("❌ Error populating category:", error.message);
    }
}

module.exports = { populateCategory };
