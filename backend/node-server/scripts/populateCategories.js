require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Category = require("../models/categoryModel");
const crypto = require("crypto");
const axios = require("axios");
const dns = require("dns");

let OLLAMA_URL = "";

// Resolve Ollama's IP address
dns.lookup("ollama-container", (err, address) => {
    if (err) {
        console.error("❌ DNS lookup failed:", err);
        return;
    }
    console.log("✅ Resolved Ollama IP:", address);
    OLLAMA_URL = `https://da3e-105-185-157-37.ngrok-free.app/api/generate`;
});

// ✅ Generate a unique hash for each question
const generateQuestionHash = (questionText) => {
    return crypto.createHash("sha256").update(questionText).digest("hex");
};

// ✅ Fetch questions from Ollama
async function fetchQuestions(categoryName, numQuestions) {
    const systemPrompt = `
    You are an AI trivia generator. Your task is to generate **${numQuestions}** trivia questions related to **${categoryName}**.
    
    ### **Instructions:**
    - Generate **fact-based, objective trivia questions** about **${categoryName}**.
    - Each question must have **exactly 4 distinct answer choices**.
    - **The correct_answer MUST be one of the 4 choices in the answers array**.
    - Provide a **brief and accurate explanation** for why the correct answer is correct.
    - **The response MUST be a valid JSON array** with NO extra text.
    - **Before responding, double-check that all conditions are met**.

    ### **Fact-Checking Requirements:**
    1. Before selecting a correct_answer, **internally verify it using a general knowledge database**.
    2. **DO NOT make up answers**. If no verifiable answer exists, **DO NOT generate a question**.
    3. If the answer is uncertain or ambiguous, **skip the question and generate another one**.
    4. **Use only well-documented, established sources for correct_answer.**
    5. **NEVER** output a wrong fact, even if it reduces the number of questions generated.

    ### **Strict Answer Validation:**
    - Ensure the "correct_answer" **is exactly one of the options** in the "answers" array.
    - **DO NOT include 'None of the above'**, 'Neither of these', or similar responses.
    - Each answer must be **clearly distinct** (no duplicates or reworded versions).
    - **DO NOT generate ambiguous or subjective questions**.
    - Ensure the **correct answer is always 100% factually accurate**.
    - **If you are unsure of the correct answer, SKIP THE QUESTION**.

    ### **Response Format (STRICTLY FOLLOW THIS EXAMPLE)**:
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
        const response = await axios.post(OLLAMA_URL, {
            model: "mistral",
            prompt: systemPrompt,
            stream: false,
            max_tokens: 250 * numQuestions,
            temperature: 0.1
        });

        let questions = JSON.parse(response.data.response.trim());

        if (!Array.isArray(questions)) {
            throw new Error("❌ Invalid response format from Ollama.");
        }

        return questions;
    } catch (error) {
        console.error("⚠️ Error fetching questions:", error.message);
        return [];
    }
}

// ✅ Populate a single category with questions
async function populateCategory(categoryId, numQuestions = 20) {
    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            console.error(`❌ Category not found: ${categoryId}`);
            return;
        }

        // ✅ Count non-disabled questions
        const nonDisabledCount = category.questions.filter(q => !q.disabled).length;

        if (nonDisabledCount >= 200) {
            console.log(`🚫 Skipping ${category.name} - It already has ${nonDisabledCount} questions.`);
            return;
        }

        console.log(`🔹 ${category.name} currently has ${nonDisabledCount} questions. Adding ${numQuestions} more...`);

        const fetchedQuestions = await fetchQuestions(category.name, numQuestions);
        let newQuestionsAdded = 0;

        fetchedQuestions.forEach(q => {
            const questionHash = generateQuestionHash(q.question);

            if (category.questions.some(q => q.hash === questionHash)) {
                console.log(`⚠️ Skipping duplicate question: ${q.question}`);
                return;
            }

            if (!q.answers.includes(q.correct_answer)) {
                console.warn(`⚠️ Fixing question: ${q.question} - Correct answer not in list!`);
                const randomIndex = Math.floor(Math.random() * q.answers.length);
                q.answers[randomIndex] = q.correct_answer; // ✅ Replace a random answer
            }

            const newQuestion = {
                _id: new mongoose.Types.ObjectId(),
                text: q.question,
                answers: q.answers.map(answer => ({
                    text: answer,
                    correctCount: 0,
                    incorrectCount: 0
                })),
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
            category.disabled = false; // ✅ Enable category after populating
            await category.save();
            console.log(`✅ Added ${newQuestionsAdded} questions to ${category.name}`);
        } else {
            console.log(`ℹ️ No new questions added to ${category.name}`);
        }

    } catch (error) {
        console.error("❌ Error populating category:", error.message);
    }
}

// ✅ Export function for external usage
module.exports = { populateCategory };
