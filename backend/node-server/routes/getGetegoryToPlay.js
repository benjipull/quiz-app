const express = require("express");
const Category = require("../models/categoryModel");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/play
// @desc    Get a random playable category (with weighting by ratings)
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
    try {
        // 1️⃣ Get categories with at least 20 questions
        let categories = await Category.find({
            disabled: false,
            "questions.19": { $exists: true } // 0-based index: ensures at least 20 questions
        }).lean();

        if (!categories.length) {
            return res.status(404).json({ message: "❌ No categories available with 20+ questions." });
        }

        // 2️⃣ Build weighted list
        let weightedPool = [];

        for (const cat of categories) {
            let weight = 1;

            if (cat.ratings && cat.ratings.length > 5) {
                // ✅ Rating-based weighting
                if (cat.averageRating >= 3) {
                    // Normalize 3 → 0, 5 → 1
                    const normalized = (cat.averageRating - 3) / 2;

                    // Curve: from 2 at rating=3 → ~20 at rating=5
                    weight = Math.floor(2 + Math.pow(normalized, 2) * 18);
                } else {
                    weight = 1; // below 3 → only 1 copy
                }
            } else {
                // ✅ Unrated or too few ratings → default to 3
                weight = 3;
            }

            // Push category into pool according to weight
            for (let i = 0; i < weight; i++) {
                weightedPool.push(cat);
            }
        }

        // 3️⃣ Pick random category from weighted pool
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        const chosenCategory = weightedPool[randomIndex];

        res.status(200).json({
            message: "🎮 Category selected for play",
            categoryId: chosenCategory._id,
            name: chosenCategory.name,
            averageRating: chosenCategory.averageRating,
            questionsCount: chosenCategory.questions.length
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
