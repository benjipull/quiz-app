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

        // ✅ OPTIMIZED: Use aggregation to count questions at DB level
        const pipeline = [
            // 1️⃣ Match active categories
            { 
                $match: { disabled: false } 
            },
            
            // 2️⃣ Lookup questions and filter by difficulty in one step
            {
                $lookup: {
                    from: "questions", // Your questions collection name
                    let: { categoryId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$categoryId", "$$categoryId"] },
                                        { $eq: ["$disabled", false] },
                                        { $gte: ["$difficulty_level", minDifficulty] },
                                        { $lte: ["$difficulty_level", maxDifficulty] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "eligibleQuestions"
                }
            },
            
            // 3️⃣ Add question count
            {
                $addFields: {
                    eligibleQuestionsCount: { $size: "$eligibleQuestions" }
                }
            },
            
            // 4️⃣ Filter categories with >= 20 eligible questions
            {
                $match: {
                    eligibleQuestionsCount: { $gte: 20 }
                }
            },
            
            // 5️⃣ Populate interests
            {
                $lookup: {
                    from: "interests",
                    localField: "interests",
                    foreignField: "_id",
                    as: "interests"
                }
            },
            
            // 6️⃣ Project only needed fields
            {
                $project: {
                    name: 1,
                    interests: { _id: 1, name: 1 },
                    averageRating: 1,
                    ratings: 1,
                    eligibleQuestionsCount: 1,
                    totalQuestions: { $size: "$eligibleQuestions" }
                }
            }
        ];

        console.time("⏱️ DB Query Time");
        let categories = await Category.aggregate(pipeline);
        console.timeEnd("⏱️ DB Query Time");

        if (!categories.length) {
            return res.status(404).json({
                message: "❌ No categories with 20+ questions in your difficulty range.",
            });
        }

        console.log(`📊 Found ${categories.length} eligible categories`);

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

        // 3️⃣ Build weighted pool (unchanged)
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

        res.status(200).json({
            message: "🎮 Category selected for play",
            categoryId: chosenCategory._id,
            name: chosenCategory.name,
            interests: chosenCategory.interests.map(i => i.name),
            averageRating: chosenCategory.averageRating || 0,
            totalQuestions: chosenCategory.totalQuestions || 0,
            filteredQuestions: chosenCategory.eligibleQuestionsCount,
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