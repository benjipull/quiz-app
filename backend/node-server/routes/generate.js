const express = require("express");
const axios = require("axios");
const dns = require("dns");
const Category = require("../models/categoryModel"); // ✅ Import Category Model

const router = express.Router();

let OLLAMA_URL = ""; // Initialize globally

// Resolve Ollama's IP before handling requests
dns.lookup("ollama-container", (err, address) => {
    if (err) {
        console.error("DNS lookup failed:", err);
        return;
    }
    console.log("✅ Resolved Ollama IP:", address);
    OLLAMA_URL = `http://${address}:11440/api/generate`;
});

// Define the POST /api/generate route
router.post("/", async (req, res) => {
    if (!OLLAMA_URL) {
        return res.status(500).json({ error: "Ollama URL not resolved yet" });
    }

    const categoryId = req.body.category; // ✅ Expecting categoryId from request
    const numAnswers = req.body.num_answers || 4;
    const maxWords = req.body.max_words || 60;

    try {
        // ✅ Fetch category name from MongoDB using categoryId
        const categoryDoc = await Category.findById(categoryId);
        if (!categoryDoc) {
            return res.status(404).json({ error: "Category not found" });
        }

        const categoryName = categoryDoc.name; // ✅ Extract category name

        let answerOptions = [];
        for (let i = 0; i < numAnswers; i++) {
            answerOptions.push(`"Option ${String.fromCharCode(65 + i)}"`);
        }

        const systemPrompt = `You are an AI trivia generator. Always return a single question about ${categoryName} in **valid JSON format**:\n
        {
          "question": "Your question?",
          "answers": [${answerOptions.join(", ")}],
          "correct_answer": "Option A",
          "explanation": "(max ${maxWords} words)"
        }
        Ensure:
        - The output is **valid JSON** (double quotes only, no trailing commas).
        - No additional text or errors.`;

        const response = await axios.post(OLLAMA_URL, {
            model: "mistral",
            prompt: systemPrompt,
            stream: false,
            max_tokens: 80,
            temperature: 0.2
        });

        let rawResponse = response.data.response.trim();

        let sanitizedResponse = rawResponse
            .replace(/\n/g, "")
            .replace(/,\s*}/g, "}")
            .replace(/,\s*\]/g, "]");

        try {
            const jsonResponse = JSON.parse(sanitizedResponse);
            res.json(jsonResponse);
        } catch (jsonError) {
            res.status(500).json({
                error: "Failed to parse JSON from Ollama",
                details: jsonError.message,
                raw_response: rawResponse
            });
        }
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: "Server error while fetching category",
            details: error.message
        });
    }
});

module.exports = router;
