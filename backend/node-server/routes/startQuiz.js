const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");
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

router.post("/", authenticateToken, async (req, res) => {
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

        const userId = req.user.id;

        console.log("✅ Extracted User ID:", userId);
    try {
        const category = await Category.findById(categoryId).lean();
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "❌ User not found" });
        }

        const userLevel = user.level || 1;

        // 🎚 Sliding difficulty window
        let minDifficulty = userLevel;
        let maxDifficulty = userLevel + 2;
        if (maxDifficulty > 10) {
            minDifficulty = 9;
            maxDifficulty = 10;
        }

        console.log(`User level: ${userLevel}, selecting difficulties ${minDifficulty}-${maxDifficulty}`);

        // ✅ Filter enabled questions by difficulty window
        const filtered = category.questions.filter(q =>
            !q.disabled &&                             // only enabled
            q.difficulty_level >= minDifficulty &&
            q.difficulty_level <= maxDifficulty
        );

        const selectedQuestions = filtered
            .sort((a, b) => {
                if (b.popularity !== a.popularity) {
                    return b.popularity - a.popularity;
                }
                return a.timesLoaded - b.timesLoaded;
            })
            .slice(0, numQuestions);

        if (selectedQuestions.length < 10) {
            console.error(
                `Cannot start Quiz, only ${selectedQuestions.length} questions found in difficulty window. Populating category: ${category._id} (${category.name})`
            );

            return res.status(404).json({
                message: "Not enough available questions in this difficulty range (minimum 10 required). Please try again in a few minutes."
            });
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

        res.json({
            message: "Questions preloaded.",
            total: selectedQuestions.length,
            difficultyRange: [minDifficulty, maxDifficulty] // for debugging
        });

    } catch (error) {
        console.error("❌ Error loading questions from database:", error.message);
        res.status(500).json({ message: "❌ Server error.", error: error.message });
    }
});

module.exports = router;
