const express = require("express");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/getGetegoryToPlay
// @desc    Get a random playable category (based on difficulty + user interests)
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('level interests').lean();

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

        console.log(`User level: ${userLevel}, difficulties ${minDifficulty}-${maxDifficulty}`);

        // ✅ OPTIMIZED: Only select needed fields, no deep population
        console.time("⏱️ DB Query Time");
        
        let categories = await Category.find({ disabled: false })
            .select('_id name interests averageRating ratings questions')
            .populate('interests', 'name')
            .lean();

        console.timeEnd("⏱️ DB Query Time");
        
        console.log(`📊 Loaded ${categories.length} active categories`);

        // ✅ Filter categories by question count (optimized with early exit)
        categories = categories.filter(cat => {
            if (!cat.questions || !Array.isArray(cat.questions)) {
                return false;
            }
            
            // Count eligible questions
            let eligibleCount = 0;
            for (const q of cat.questions) {
                if (!q.disabled && 
                    q.difficulty_level >= minDifficulty && 
                    q.difficulty_level <= maxDifficulty) {
                    eligibleCount++;
                    // Early exit: stop counting after 20
                    if (eligibleCount >= 20) {
                        return true;
                    }
                }
            }
            return false;
        });

        if (!categories.length) {
            return res.status(404).json({
                message: "❌ No categories with 20+ questions in your difficulty range.",
            });
        }

        console.log(`✅ Found ${categories.length} eligible categories`);

        // 2️⃣ Filter by user interests (AFTER getting filtered categories)
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
            console.log(`🎯 ${interestMatched.length} categories match interests`);
            categories = interestMatched;
        } else {
            console.log("⚠️ No interest matches, using all eligible categories");
        }

        // 3️⃣ Build weighted pool
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

        // 4️⃣ Pick random category
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        const chosenCategory = weightedPool[randomIndex];

        // Count filtered questions for response
        const filteredCount = chosenCategory.questions.filter(q =>
            !q.disabled &&
            q.difficulty_level >= minDifficulty && 
            q.difficulty_level <= maxDifficulty
        ).length;

        res.status(200).json({
            message: "🎮 Category selected for play",
            categoryId: chosenCategory._id,
            name: chosenCategory.name,
            interests: chosenCategory.interests.map(i => i.name),
            averageRating: chosenCategory.averageRating || 0,
            totalQuestions: chosenCategory.questions.length,
            filteredQuestions: filteredCount,
            difficultyRange: [minDifficulty, maxDifficulty],
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ 
            message: "⚠️ Server error", 
            error: error.message 
        });
    }
});

module.exports = router;