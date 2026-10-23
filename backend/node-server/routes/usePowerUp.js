require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const Category = require("../models/categoryModel");
const authenticateToken = require("../middleware/auth");
const { InventoryItemTypes } = require("../models/inventoryTypes");
const { userQuestions } = require("../index");

const router = express.Router();

/**
 * POST /api/usePowerUp
 * Use a power-up during a quiz
 * Body: { powerUpType, questionId }
 * Headers: Authorization: Bearer <userToken>
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { powerUpType, questionId } = req.body;

    // Get user token from header
    const authHeader = req.headers.authorization;
    const userToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!userToken) {
      return res.status(401).json({ error: "Missing authorization token." });
    }

    // Validate power-up type
    if (!Object.values(InventoryItemTypes).includes(powerUpType)) {
      return res.status(400).json({ error: "Invalid power-up type." });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if user has the power-up
    if (!user.hasInventoryItem(powerUpType, 1)) {
      return res.status(400).json({ error: "You don't have this power-up." });
    }

    // Get user's quiz session
    const userSession = userQuestions[userToken];
    if (!userSession) {
      return res.status(404).json({ error: "No active quiz session found." });
    }

    // Find the question in the category
    const questionResult = await Category.aggregate([
      { $unwind: "$questions" },
      {
        $match: {
          "questions._id": new mongoose.Types.ObjectId(questionId)
        }
      },
      {
        $project: {
          categoryId: "$_id",
          categoryName: "$name",
          question: "$questions"
        }
      }
    ]);

    if (!questionResult || questionResult.length === 0) {
      return res.status(404).json({ error: "Question not found." });
    }

    const { categoryId, question } = questionResult[0];
    let effect = {};

    // Process power-up based on type
    switch (powerUpType) {
      case InventoryItemTypes.ASK_THE_AUDIENCE:
        // Return answer statistics
        const answerCounts = question.answers || [];
        const totalVotes = answerCounts.reduce((sum, ac) => sum + (ac.correctCount || 0), 0);

        const answerStats = answerCounts.map(answer => {
          const count = answer.correctCount || 0;
          return {
            text: answer.text,
            percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
            count
          };
        });

        effect = {
          type: 'ASK_THE_AUDIENCE',
          data: {
            answerStats,
            totalVotes
          }
        };
        break;

      case InventoryItemTypes.FIFTY_FIFTY:
        // Remove two incorrect answers
        const correctAnswer = question.correct_answer;
        const allAnswers = question.answers.map(a => a.text);
        const incorrectAnswers = allAnswers.filter(a => a !== correctAnswer);

        // Randomly select 2 incorrect answers to remove
        const shuffled = incorrectAnswers.sort(() => 0.5 - Math.random());
        const answersToRemove = shuffled.slice(0, 2);
        const remainingAnswers = allAnswers.filter(a => !answersToRemove.includes(a));

        effect = {
          type: 'FIFTY_FIFTY',
          data: {
            remainingAnswers,
            removedAnswers: answersToRemove
          }
        };
        break;

      case InventoryItemTypes.SWAP_QUESTION:
        // Find a replacement question from the same category
        const replacementResult = await Category.aggregate([
          {
            $match: {
              _id: categoryId,
              disabled: false
            }
          },
          { $unwind: "$questions" },
          {
            $match: {
              "questions._id": { $ne: new mongoose.Types.ObjectId(questionId) },
              "questions.disabled": false
            }
          },
          { $sort: { "questions.timesLoaded": 1 } },
          { $limit: 1 },
          {
            $project: {
              _id: "$questions._id",
              question: "$questions.text",
              answers: {
                $map: {
                  input: "$questions.answers",
                  as: "answer",
                  in: "$$answer.text"
                }
              },
              correct_answer: "$questions.correct_answer",
              explanation: "$questions.explanation",
              image64: "$questions.image64",
              difficulty: "$questions.difficulty",
              difficultyName: { $literal: "" },
              difficultyLevel: "$questions.difficulty_level"
            }
          }
        ]);

        if (!replacementResult || replacementResult.length === 0) {
          return res.status(404).json({ error: "No replacement question available." });
        }

        const replacement = replacementResult[0];

        effect = {
          type: 'SWAP_QUESTION',
          data: {
            newQuestion: replacement
          }
        };

        // Update user's question queue if current question is in queue
        if (userSession.current && userSession.current._id.toString() === questionId) {
          userSession.current = replacement;
        }
        break;

      case InventoryItemTypes.DIFFICULTY_SWAP:
        // Find a question with -1 difficulty level
        const currentDifficulty = question.difficulty_level || 5;
        const targetDifficulty = Math.max(1, currentDifficulty - 1);

        const easierResult = await Category.aggregate([
          {
            $match: {
              _id: categoryId,
              disabled: false
            }
          },
          { $unwind: "$questions" },
          {
            $match: {
              "questions._id": { $ne: new mongoose.Types.ObjectId(questionId) },
              "questions.disabled": false,
              "questions.difficulty_level": targetDifficulty
            }
          },
          { $sort: { "questions.timesLoaded": 1 } },
          { $limit: 1 },
          {
            $project: {
              _id: "$questions._id",
              question: "$questions.text",
              answers: {
                $map: {
                  input: "$questions.answers",
                  as: "answer",
                  in: "$$answer.text"
                }
              },
              correct_answer: "$questions.correct_answer",
              explanation: "$questions.explanation",
              image64: "$questions.image64",
              difficulty: "$questions.difficulty",
              difficultyName: { $literal: "" },
              difficultyLevel: "$questions.difficulty_level"
            }
          }
        ]);

        if (!easierResult || easierResult.length === 0) {
          return res.status(404).json({ error: "No easier question available." });
        }

        const easierQuestion = easierResult[0];

        effect = {
          type: 'DIFFICULTY_SWAP',
          data: {
            newQuestion: easierQuestion
          }
        };

        // Update user's current question if it matches
        if (userSession.current && userSession.current._id.toString() === questionId) {
          userSession.current = easierQuestion;
        }
        break;

      default:
        return res.status(400).json({ error: "Power-up not implemented." });
    }

    // Remove the power-up from user's inventory
    const removed = user.removeInventoryItem(powerUpType, 1);
    if (!removed) {
      return res.status(400).json({ error: "Failed to use power-up." });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      effect,
      remainingQuantity: user.getInventoryItem(powerUpType),
      inventory: user.inventory
    });

  } catch (error) {
    console.error("❌ Error using power-up:", error);
    return res.status(500).json({ error: "Server error. Please try again later." });
  }
});

module.exports = router;
