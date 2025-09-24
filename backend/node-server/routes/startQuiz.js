const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const { userQuestions } = require("../index"); // Import shared store
const { populateCategory } = require("../scripts/populateCategories"); // Import async question population


const difficultyNames = {
    1: "Very Easy",
    2: "Easy",
    3: "Fairly Easy",
    4: "Moderate",
    5: "Challenging",
    6: "Hard",
    7: "Very Hard",
    8: "Expert",
    9: "Extremely Hard",
    10: "Legendary"
};

router.post("/", async (req, res) => {
    const { categoryId, numQuestions } = req.body;

    const authHeader = req.headers["authorization"];
    const userToken = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!userToken) {
        return res.status(401).json({ message: "Missing or invalid Authorization header." });
    }

    if (!categoryId || !numQuestions) {
        return res.status(400).json({ message: "Missing required fields: categoryId, numQuestions." });
    }

    try {
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        const selectedQuestions = category.questions
            .sort((a, b) => a.timesLoaded - b.timesLoaded)
            .slice(0, numQuestions);

        if (selectedQuestions.length === 0) {
            console.error(`Cannot start Quiz, no questions found. Populating category: ${category._id} (${category.name})`);
            populateCategory(category._id, 20);

            return res.status(404).json({ message: "No available questions in this category please try again in a few minutes." });
        }

        // Store questions for user in memory
        userQuestions[userToken] = {
            queue: selectedQuestions.map(q => ({
                _id: q._id,
                question: q.text,
                answers: q.answers.map(a => a.text),
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                timesAnsweredCorrectly: q.timesAnsweredCorrectly,
                timesAnsweredIncorrectly: q.timesAnsweredIncorrectly,
                difficultyLevel: q.difficulty_level,
                difficultyName: difficultyNames[q.difficulty_level] || "Unknown"
            })),
            current: null
        };

        console.log(`Loaded ${selectedQuestions.length} questions for user ${userToken}`);

        res.json({ message: "✅ Questions preloaded!", total: selectedQuestions.length });

    } catch (error) {
        console.error("❌ Error loading questions from database:", error.message);
        res.status(500).json({ message: "❌ Server error.", error: error.message });
    }
});

module.exports = router;
