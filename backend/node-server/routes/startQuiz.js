const express = require("express");
const axios = require("axios");
const dns = require("dns");
const Category = require("../models/categoryModel"); // ✅ Import the Category model
const router = express.Router();
const { userQuestions } = require("../index"); // ✅ Import shared store

let OLLAMA_URL = "";

// Resolve Ollama's IP address
dns.lookup("ollama-container", (err, address) => {
    if (err) {
        console.error("DNS lookup failed:", err);
        return;
    }
    console.log("✅ Resolved Ollama IP:", address);
    OLLAMA_URL = `http://${address}:11440/api/generate`;
});

// ✅ Route: Preload Questions in One Call
router.post("/", async (req, res) => {
    if (!OLLAMA_URL) {
        return res.status(500).json({ error: "Ollama URL not resolved yet" });
    }

    const { categoryId, numQuestions, userToken } = req.body;
    if (!categoryId || !numQuestions || !userToken) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    try {
        // ✅ Fetch Category Name from MongoDB
        const category = await Category.findById(categoryId).select("name");
        if (!category) {
            return res.status(404).json({ message: "❌ Category not found." });
        }
        const categoryName = category.name;

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
        
        ### **Failure Cases (DO NOT DO THIS!):**
        - "correct_answer": "Neither of these"** (Incorrect: Must match one of the answers!)
        - "answers": ["Yes", "No", "Maybe", "Possibly"]** (Incorrect: Too vague!)
        - "correct_answer": "The moon" when answers are ["Sun", "Stars", "Earth", "Mars"]** (Incorrect: Must match one of the answers!)
        - "answers": ["Paris", "Paris", "London", "Berlin"]** (Incorrect: Duplicate options!)
            
        **WARNING:** If any of these rules are violated, the response is INVALID.
        `;
        
        const response = await axios.post(OLLAMA_URL, {
            model: "mistral",
            prompt: systemPrompt,
            stream: false,
            max_tokens: 150 * numQuestions,
            temperature: 0.1
        });

        let rawResponse = response.data.response.trim();
        let sanitizedResponse = rawResponse.replace(/\n/g, "").replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]");

        try {
            const jsonResponse = JSON.parse(sanitizedResponse);

            if (!Array.isArray(jsonResponse) || jsonResponse.length === 0) {
                return res.status(500).json({ message: "❌ Ollama did not return valid questions.", rawResponse });
            }

            userQuestions[userToken] = jsonResponse; // ✅ Store all questions for the user
            console.log(`✅ Questions Generated for ${categoryName}:`, jsonResponse);
            res.json({ message: "✅ Questions preloaded!", total: jsonResponse.length });
        } catch (jsonError) {
            res.status(500).json({
                error: "❌ Failed to parse JSON from Ollama",
                details: jsonError.message,
                raw_response: rawResponse
            });
        }
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: "❌ Server error",
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;
