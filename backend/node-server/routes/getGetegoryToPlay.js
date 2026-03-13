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
    const user = await User.findById(userId).select("level interests").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userLevel = user.level || 1;
    const userInterests = user.interests || [];

    // Keep this aligned with startQuiz.
    const minDifficulty = Math.max(1, userLevel - 1);
    const maxDifficulty = Math.min(10, userLevel + 2);

    console.log(`User level: ${userLevel}, difficulties ${minDifficulty}-${maxDifficulty}`);

    // 1) Load category metadata only.
    let categories = await Category.find({ disabled: false })
      .select("_id name interests averageRating ratings")
      .populate("interests", "name")
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

    // 4) Filter by user interests if possible.
    const interestMatched = categories.filter(
      (cat) =>
        Array.isArray(cat.interests) &&
        cat.interests.length > 0 &&
        cat.interests.some((intObj) =>
          userInterests.some((userIntId) => intObj._id.toString() === userIntId.toString())
        )
    );

    const finalCategories = interestMatched.length > 0 ? interestMatched : categories;

    // 5) Build weighted pool.
    const weightedPool = [];

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

      for (let i = 0; i < weight; i += 1) {
        weightedPool.push(cat);
      }
    }

    // 6) Pick random category.
    const randomIndex = Math.floor(Math.random() * weightedPool.length);
    const chosenCategory = weightedPool[randomIndex];
    const eligibleCount = countMap.get(chosenCategory._id.toString()) || 0;

    const fullCategory = await Category.findById(chosenCategory._id)
      .select("questions")
      .lean();

    res.status(200).json({
      message: "Category selected for play",
      categoryId: chosenCategory._id,
      name: chosenCategory.name,
      interests: Array.isArray(chosenCategory.interests)
        ? chosenCategory.interests.map((i) => i.name)
        : [],
      averageRating: chosenCategory.averageRating || 0,
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
