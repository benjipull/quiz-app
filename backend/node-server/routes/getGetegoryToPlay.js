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

        // ✅ STEP 1: Load only category metadata (NO questions)
        console.time("⏱️ Load Categories");

        let categories = await Category.find({ disabled: false })
            .select('_id name interests averageRating ratings')
            .populate('interests', 'name')
            .lean();

        console.timeEnd("⏱️ Load Categories");
        console.log(`📊 Loaded ${categories.length} active categories`);

        // ✅ STEP 2: For each category, count eligible questions using aggregation
        console.time("⏱️ Count Questions");

        const categoryIds = categories.map(c => c._id);

        const questionCounts = await Category.aggregate([
            {
                $match: {
                    _id: { $in: categoryIds },
                    disabled: false,
                    "questions.disabled": false // early elimination
                }
            },
            {
                $project: {
                    eligibleCount: {
                        $size: {
                            $filter: {
                                input: "$questions",
                                as: "q",
                                cond: { $eq: ["$$q.disabled", false] }
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    eligibleCount: { $gte: 20 }
                }
            }
        ]);



        console.timeEnd("⏱️ Count Questions");
        console.log(`✅ Found ${questionCounts.length} categories with 20+ eligible questions`);

        // Create a map of counts
        const countMap = new Map();
        questionCounts.forEach(item => {
            countMap.set(item._id.toString(), item.eligibleCount);
        });

        // ✅ STEP 3: Filter categories that have enough questions
        categories = categories.filter(cat =>
            countMap.has(cat._id.toString())
        );

        if (!categories.length) {
            return res.status(404).json({
                message: "❌ No categories with 20+ questions in your difficulty range.",
            });
        }

        // ✅ STEP 4: Filter by user interests
        const interestMatched = categories.filter(cat =>
            Array.isArray(cat.interests) &&
            cat.interests.length > 0 &&
            cat.interests.some(intObj =>
                userInterests.some(userIntId =>
                    intObj._id.toString() === userIntId.toString()
                )
            )
        );

        // Use matched categories if found, otherwise keep all
        const finalCategories = interestMatched.length > 0 ? interestMatched : categories;

        if (interestMatched.length > 0) {
            console.log(`🎯 ${interestMatched.length} categories match interests`);
        } else {
            console.log("⚠️ No interest matches, using all eligible categories");
        }

        // ✅ STEP 5: Build weighted pool
        let weightedPool = [];

        for (const cat of finalCategories) {
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

        // ✅ STEP 6: Pick random category
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        const chosenCategory = weightedPool[randomIndex];

        const eligibleCount = countMap.get(chosenCategory._id.toString()) || 0;

        // Get total question count for this category
        const fullCategory = await Category.findById(chosenCategory._id)
            .select('questions')
            .lean();

        res.status(200).json({
            message: "🎮 Category selected for play",
            categoryId: chosenCategory._id,
            name: chosenCategory.name,
            interests: chosenCategory.interests.map(i => i.name),
            averageRating: chosenCategory.averageRating || 0,
            totalQuestions: fullCategory?.questions?.length || 0,
            filteredQuestions: eligibleCount,
            difficultyRange: [minDifficulty, maxDifficulty],
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        console.error("Stack:", error.stack);
        res.status(500).json({
            message: "⚠️ Server error",
            error: error.message
        });
    }
});

module.exports = router;