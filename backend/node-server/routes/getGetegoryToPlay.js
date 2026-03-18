const express = require("express");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");

const router = express.Router();
const MIN_QUESTIONS_FOR_PLAY = 5;

// @route   GET /api/getGetegoryToPlay
// @desc    Get a random playable category (based on difficulty + user interests)
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("level").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userLevel = user.level || 1;

    // Keep this aligned with startQuiz.
    const minDifficulty = Math.max(1, userLevel);
    const maxDifficulty = Math.min(10, userLevel + 1);

    console.log(`User level: ${userLevel}, difficulties ${minDifficulty}-${maxDifficulty}`);

    // 1) Load category metadata only.
    let categories = await Category.find({ disabled: false })
      .select("_id name")
      .lean();

    const categoryIds = categories.map((c) => c._id);

    // 2) Count questions eligible for this difficulty range.
    const questionCounts = await Category.aggregate([
      {
        $match: {
          _id: { $in: categoryIds },
          disabled: false,
          "questions.disabled": false,
        },
      },
      {
        $project: {
          eligibleCount: {
            $size: {
              $filter: {
                input: "$questions",
                as: "q",
                cond: {
                  $and: [
                    { $eq: ["$$q.disabled", false] },
                    { $gte: ["$$q.difficulty_level", minDifficulty] },
                    { $lte: ["$$q.difficulty_level", maxDifficulty] },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $match: {
          eligibleCount: { $gte: MIN_QUESTIONS_FOR_PLAY },
        },
      },
    ]);

    const countMap = new Map();
    questionCounts.forEach((item) => {
      countMap.set(item._id.toString(), item.eligibleCount);
    });

    // 3) Keep categories that have enough questions in this range.
    categories = categories.filter((cat) => countMap.has(cat._id.toString()));

    if (!categories.length) {
      return res.status(404).json({
        message: `No categories with at least ${MIN_QUESTIONS_FOR_PLAY} questions in your difficulty range.`,
      });
    }

    // 4) Pick a random eligible category (no interests/rating weighting).
    const randomIndex = Math.floor(Math.random() * categories.length);
    const chosenCategory = categories[randomIndex];
    const eligibleCount = countMap.get(chosenCategory._id.toString()) || 0;

    const fullCategory = await Category.findById(chosenCategory._id)
      .select("questions")
      .lean();

    res.status(200).json({
      message: "Category selected for play",
      categoryId: chosenCategory._id,
      name: chosenCategory.name,
      totalQuestions: fullCategory?.questions?.length || 0,
      filteredQuestions: eligibleCount,
      difficultyRange: [minDifficulty, maxDifficulty],
    });
  } catch (error) {
    console.error("Server error in getGetegoryToPlay:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
