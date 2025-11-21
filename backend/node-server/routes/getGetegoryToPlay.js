const express = require("express");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/play
// @desc    Get a random playable category (based on difficulty + user interests)
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).lean();

        if (!user) {
            return res.status(404).json({ message: "❌ User not found" });
        }

        const userLevel = user.level || 1;
        const userInterests = user.interests || [];

        // 🎚 Sliding difficulty window
        let minDifficulty = userLevel;
        let maxDifficulty = userLevel + 2;
        if (maxDifficulty > 10) {
            minDifficulty = 9;
            maxDifficulty = 10;
        }

        console.log(
            `User level: ${userLevel}, selecting difficulties ${minDifficulty}-${maxDifficulty}`
        );
        console.log(`User interests: ${userInterests.join(", ")}`);

        // 1️⃣ Load all active categories
        let categories = await Category.find({ disabled: false })
            .lean()
            .populate("interests", "name");

        // 2️⃣ Filter by user interests — FIRST PASS (safe version)
        let interestMatched = categories.filter(cat =>
            Array.isArray(cat.interests) &&
            cat.interests.length > 0 &&
            cat.interests.some(intObj =>
                userInterests.some(userIntId =>
                    intObj._id.toString() === userIntId.toString()
                )
            )
        );

        if (interestMatched.length > 0) {
            console.log(`🎯 Found ${interestMatched.length} interest-matching categories`);
            categories = interestMatched;
        } else {
            console.log("⚠️ No category matched user interests → Falling back to ALL categories");
        }

        // 3️⃣ Filter categories by question count (same logic as before)
        categories = categories.filter(cat => {
            const filtered = cat.questions.filter(q =>
                !q.disabled &&
                q.difficulty_level >= minDifficulty &&
                q.difficulty_level <= maxDifficulty
            );
            return filtered.length >= 20;
        });

        if (!categories.length) {
            return res.status(404).json({
                message:
                    "❌ No categories available with 20+ questions in your difficulty range.",
            });
        }

        // 4️⃣ Build weighted pool (unchanged)
        let weightedPool = [];

        for (const cat of categories) {
            let weight = 1;

            if (cat.ratings && cat.ratings.length > 5) {
                if (cat.averageRating >= 3) {
                    const normalized = (cat.averageRating - 3) / 2;
                    weight = Math.floor(2 + Math.pow(normalized, 2) * 18);
                } else {
                    weight = 1;
                }
            } else {
                weight = 3;
            }

            for (let i = 0; i < weight; i++) {
                weightedPool.push(cat);
            }
        }

        // 5️⃣ Pick random category
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        const chosenCategory = weightedPool[randomIndex];

        const filteredCount = chosenCategory.questions.filter(q =>
            q.difficulty_level >= minDifficulty && q.difficulty_level <= maxDifficulty
        ).length;

        res.status(200).json({
            message: "🎮 Category selected for play",
            categoryId: chosenCategory._id,
            name: chosenCategory.name,
            interests: chosenCategory.interests.map(i => i.name),
            averageRating: chosenCategory.averageRating,
            totalQuestions: chosenCategory.questions.length,
            filteredQuestions: filteredCount,
            difficultyRange: [minDifficulty, maxDifficulty],
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
