require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");
const { ObjectId } = require("mongoose").Types;
const Category = require("./models/categoryModel");
const dns = require("dns");

let OLLAMA_URL = "";

// ✅ Resolve Ollama's IP before running the script
dns.lookup("ollama-container", (err, address) => {
    if (err) {
        console.error("❌ DNS lookup failed:", err);
        return;
    }
    console.log("✅ Resolved Ollama IP:", address);
    OLLAMA_URL = `http://${address}:11440/api/generate`;

    // ✅ Start population process once Ollama is resolved
    populateCategoriesWithQuestions();
});

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

/**
 * Generates a SHA-256 hash for a given question.
 * @param {string} questionText - The question text to hash.
 * @returns {string} - The SHA-256 hash.
 */
function generateQuestionHash(questionText) {
    return crypto.createHash("sha256").update(questionText).digest("hex");
}

/**
 * Generates trivia questions for a given category using Ollama API.
 * @param {string} categoryName - The name of the category.
 * @param {number} numQuestions - Number of questions to generate.
 */
async function generateQuestions(categoryName, numQuestions = 20) {
    console.log(`🟡 Generating ${numQuestions} questions for: ${categoryName}...`);

    const systemPrompt = `
    You are an AI trivia generator. Generate **${numQuestions}** trivia questions for the category **${categoryName}**.

    ### **Instructions:**
    - Each question must have **exactly 4 unique answer options**.
    - **One of the answers MUST be correct**, and it must be in the answers array.
    - Provide a **brief and accurate explanation** for the correct answer.
    - **Output MUST be a valid JSON array** with no extra text.

    ### **Response Format Example:**
    [
        {
            "question": "What is the capital of France?",
            "answers": ["Berlin", "Madrid", "Paris", "Rome"],
            "correct_answer": "Paris",
            "explanation": "Paris is the capital city of France."
        }
    ]

    **Ensure strict formatting!**
    `;

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: "mistral",
            prompt: systemPrompt,
            stream: false,
            max_tokens: 1000 * numQuestions,
            temperature: 0.1
        });

        let rawResponse = response.data.response.trim();
        let sanitizedResponse = rawResponse.replace(/\n/g, "").replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]");

        const questions = JSON.parse(sanitizedResponse);
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("Invalid response format from Ollama.");
        }

        // ✅ Enhance questions with `_id`, `question_hash`, `times_shown`, `popularity_score`, `disabled`
        const enhancedQuestions = questions.map(q => ({
            _id: new ObjectId(),                // ✅ Assign MongoDB ObjectId
            question: q.question,               // ✅ Keep original question
            answers: q.answers,                 // ✅ Keep answers array
            correct_answer: q.correct_answer,   // ✅ Store correct answer
            explanation: q.explanation,         // ✅ Store explanation
            question_hash: generateQuestionHash(q.question), // ✅ Generate SHA-256 hash
            times_shown: 0,                      // ✅ Track number of times shown
            popularity_score: 0,                  // ✅ Track likes/dislikes
            disabled: false                       // ✅ Default to "false" (enabled)
        }));

        console.log(`✅ Successfully generated ${enhancedQuestions.length} questions for: ${categoryName}`);
        return enhancedQuestions;
    } catch (error) {
        console.error(`❌ Error generating questions for ${categoryName}:`, error.message);
        return [];
    }
}

/**
 * Populates each category in the database with generated questions.
 */
async function populateCategoriesWithQuestions() {
    try {
        const categories = await Category.find({});
        console.log(`🟢 Found ${categories.length} categories.`);

        for (const category of categories) {
            console.log(`🔹 Processing category: ${category.name}`);

            // ✅ Generate questions
            const questions = await generateQuestions(category.name, 20);

            if (questions.length > 0) {
                // ✅ Store questions in the category
                category.questions = questions;
                await category.save();
                console.log(`✅ Saved questions for ${category.name}`);
            } else {
                console.warn(`⚠️ Skipped saving due to no questions for ${category.name}`);
            }
        }

        console.log("🎉 All categories populated with questions!");
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Error populating categories:", error.message);
        mongoose.connection.close();
    }
}