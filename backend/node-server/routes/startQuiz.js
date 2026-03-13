const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Category = require("../models/categoryModel");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");
const { userQuestions } = require("../index");

const QUIZ_COST = 50;

const difficultyNames = {
  1: "Basic",
  2: "Easy",
  3: "Casual",
  4: "Moderate",
  5: "Challenging",
  6: "Hard",
  7: "Tough",
  8: "Expert",
  9: "Master",
  10: "Legendary",
};

router.post("/", authenticateToken, async (req, res) => {
  const { categoryId, numQuestions = 5 } = req.body;
  const userId = req.user.id;
  const requestedQuestions = Number.parseInt(String(numQuestions), 10);
  const safeNumQuestions = Number.isNaN(requestedQuestions)
    ? 5
    : Math.min(20, Math.max(1, requestedQuestions));

  if (!categoryId) {
    return res.status(400).json({ message: "Missing categoryId." });
  }

  const authHeader = req.headers.authorization;
  const userToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!userToken) {
    return res.status(401).json({ message: "Missing or invalid Authorization header." });
  }

  try {
    // 1) Deduct quiz cost atomically
    const user = await User.findOneAndUpdate(
      { _id: userId, coins: { $gte: QUIZ_COST } },
      { $inc: { coins: -QUIZ_COST } },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ message: "Not enough coins to start quiz." });
    }

    const userLevel = user.level || 1;
    const minDifficulty = Math.max(1, userLevel - 1);
    const maxDifficulty = Math.min(10, userLevel + 2);

    // 2) Strict fetch in the level window first
    const strictQuestions = await Category.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(categoryId),
          disabled: false,
        },
      },
      { $unwind: "$questions" },
      {
        $match: {
          "questions.disabled": false,
          "questions.difficulty_level": {
            $gte: minDifficulty,
            $lte: maxDifficulty,
          },
        },
      },
      {
        $sort: {
          "questions.timesLoaded": 1,
          "questions.popularity": -1,
        },
      },
      { $limit: safeNumQuestions },
      {
        $project: {
          _id: "$questions._id",
          question: "$questions.text",
          answers: "$questions.answers.text",
          correct_answer: "$questions.correct_answer",
          explanation: "$questions.explanation",
          timesAnsweredCorrectly: "$questions.timesAnsweredCorrectly",
          timesAnsweredIncorrectly: "$questions.timesAnsweredIncorrectly",
          difficultyLevel: "$questions.difficulty_level",
        },
      },
    ]);

    let questions = strictQuestions;
    let fallbackUsed = false;

    // 3) Fallback: use closest available difficulties in the same category
    if (questions.length < safeNumQuestions) {
      const expandedQuestions = await Category.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(categoryId),
            disabled: false,
          },
        },
        { $unwind: "$questions" },
        {
          $match: {
            "questions.disabled": false,
          },
        },
        {
          $addFields: {
            difficultyDistance: {
              $abs: {
                $subtract: [
                  { $ifNull: ["$questions.difficulty_level", 0] },
                  userLevel,
                ],
              },
            },
          },
        },
        {
          $sort: {
            difficultyDistance: 1,
            "questions.timesLoaded": 1,
            "questions.popularity": -1,
          },
        },
        { $limit: safeNumQuestions },
        {
          $project: {
            _id: "$questions._id",
            question: "$questions.text",
            answers: "$questions.answers.text",
            correct_answer: "$questions.correct_answer",
            explanation: "$questions.explanation",
            timesAnsweredCorrectly: "$questions.timesAnsweredCorrectly",
            timesAnsweredIncorrectly: "$questions.timesAnsweredIncorrectly",
            difficultyLevel: "$questions.difficulty_level",
          },
        },
      ]);

      if (expandedQuestions.length < safeNumQuestions) {
        await User.updateOne({ _id: userId }, { $inc: { coins: QUIZ_COST } });

        return res.status(404).json({
          message: "Not enough available questions in this category. Coins refunded.",
          requested: safeNumQuestions,
          available: expandedQuestions.length,
        });
      }

      questions = expandedQuestions;
      fallbackUsed = true;
    }

    // 4) Store quiz in memory
    userQuestions[userToken] = {
      queue: questions.map((q) => ({
        ...q,
        difficultyName: difficultyNames[q.difficultyLevel] || "Unknown",
      })),
      current: null,
    };

    // 5) Respond
    res.json({
      message: "Questions preloaded. Quiz cost deducted.",
      total: questions.length,
      difficultyRange: [minDifficulty, maxDifficulty],
      fallbackUsed,
      userCoins: user.coins,
    });
  } catch (err) {
    console.error("Quiz preload error:", err);

    // Safety refund if something unexpected happened
    await User.updateOne({ _id: userId }, { $inc: { coins: QUIZ_COST } });

    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
