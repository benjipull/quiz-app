const express = require("express");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/play
// @desc    Get a random playable category (with weighting by ratings, requires 20+ filtered questions)
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).lean();
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

        // 1️⃣ Get categories (not disabled)
        let categories = await Category.find({ disabled: false }).lean();

        // 2️⃣ Keep only categories with at least 20 matching (enabled) questions
        categories = categories.filter(cat => {
            const filtered = cat.questions.filter(q =>
                !q.disabled &&                           // only enabled
                q.difficulty_level >= minDifficulty &&
                q.difficulty_level <= maxDifficulty
            );
            return filtered.length >= 20;
        });

        if (!categories.length) {
            return res.status(404).json({ message: "❌ No categories available with 20+ questions in your difficulty range." });
        }

        // 3️⃣ Build weighted list
        let weightedPool = [];

        for (const cat of categories) {
            let weight = 1;

            if (cat.ratings && cat.ratings.length > 5) {
                // ✅ Rating-based weighting
                if (cat.averageRating >= 3) {
                    const normalized = (cat.averageRating - 3) / 2; // Normalize 3–5
                    weight = Math.floor(2 + Math.pow(normalized, 2) * 18);
                } else {
                    weight = 1; // below 3
                }
            } else {
                weight = 3; // unrated or few ratings
            }

            for (let i = 0; i < weight; i++) {
                weightedPool.push(cat);
            }
        }

        // 4️⃣ Pick random category
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        const chosenCategory = weightedPool[randomIndex];

        // Count only filtered questions for return
        const filteredCount = chosenCategory.questions.filter(q =>
            q.difficulty_level >= minDifficulty && q.difficulty_level <= maxDifficulty
        ).length;

        res.status(200).json({
            message: "🎮 Category selected for play",
            categoryId: chosenCategory._id,
            name: chosenCategory.name,
            averageRating: chosenCategory.averageRating,
            totalQuestions: chosenCategory.questions.length,
            filteredQuestions: filteredCount,
            difficultyRange: [minDifficulty, maxDifficulty]
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
