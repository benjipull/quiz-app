require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const crypto = require("crypto");
const axios = require("axios");
const { version } = require("os");

//Ollama URL
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
    console.log(`🚀 Fetching ${numQuestions} questions for category: "${categoryName}"`);

    const systemPrompt = `
        You are an AI trivia generator with expert-level knowledge. Your task is to generate a trivia question related to **${categoryName}** using **only factually verified information**.

        ### **Instructions:**
        - **DO NOT generate a question unless it is based on a real, verifiable fact.**
        - **DO NOT fabricate** or assume information. If unsure, return an empty JSON array.
        - The trivia question **must be 100% factual and verifiable**.
        - Each question must have **exactly 4 distinct answer choices**.
        - The **correct_answer MUST be one of the 4 choices** in the answers array.
        - There must be **only one correct answer**; the other 3 must be incorrect.
        - **Provide a reliable source-based explanation** for why the correct answer is correct.

        ### **Response Format:**
        - The response **MUST be a valid JSON array** with **NO extra text**.
        - If you cannot verify the fact, return '[]' (an empty array).

        ### **Response Example:**
        '''json
        [
            {
                "question": "What is the capital of France?",
                "answers": ["Berlin", "Madrid", "Paris", "Rome"],
                "correct_answer": "Paris",
                "explanation": "Paris is the capital city of France and has been since 508 AD."
            }
        ]

            `;

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: "mistral",
            prompt: systemPrompt,
            stream: false,
            max_tokens: 150,
            temperature: 0.0,
            top_p: 0.1
        });

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

        // ✅ Self-verify each question
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

// ✅ Populate a single category with questions and detailed logging
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
                hash: questionHash,
                version: 4
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

// ✅ Function to verify the question back with Mistral
async function verifyQuestion(question) {
    console.log(`🔍 Verifying question: "${question.question}"`);

    const verificationPrompt = `
        You are a fact-checking AI. Your task is to verify if the following trivia question is factually accurate.

        ### **Trivia Question:**
        "${question.question}"

        Correct Answer: "${question.correct_answer}"
        Explanation: "${question.explanation}"

        ### **Instructions:**
        - Research existing legal records or widely known facts.
        - If this law does not exist or is unverifiable, return \`false\`.
        - If this law is accurate, return \`true\`.

        ### **Response Format:**
        '''json
        { "is_factually_correct": true }
        '''`;

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: "mistral",
            prompt: verificationPrompt,
            stream: false,
            max_tokens: 50,
            temperature: 0.0,
            top_p: 0.5
        });

        if (!response.data || !response.data.response) {
            throw new Error("❌ Ollama verification response missing 'response' field.");
        }

        const aiResponse = response.data.response.trim();
        console.log("✅ AI Verification Response:", aiResponse);

        return aiResponse.includes('"is_factually_correct": true');

    } catch (error) {
        console.error("❌ Error verifying question:", error.message);
        return false;
    }
}

module.exports = { populateCategory };
