const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/:categoryId/completion", authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { questionsAttempted, correctAnswers, incorrectAnswers } = req.body;
        const userId = req.user.id;

        console.log("✅ Received categoryId:", categoryId);
        console.log("✅ Extracted User ID:", userId);

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: "❌ Invalid category ID format." });
        }

        if (questionsAttempted == null || correctAnswers == null || incorrectAnswers == null) {
            return res.status(400).json({ message: "⚠️ All fields are required." });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "❌ Category not found" });
        }

        // ✅ Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "❌ User not found" });
        }

        // ✅ Calculate percentage
        const percentageCorrect = (correctAnswers / questionsAttempted) * 100;

        // ✅ Calculate knowledge gained (exponential reward)
        const knowledgePointsEarned = Math.floor(Math.pow(correctAnswers, 1.2) * 5);

        // ✅ Track previous level
        const previousLevel = user.level;

        // ✅ Update user’s points & level
        user.knowledgePoints += knowledgePointsEarned;
        user.level = user.calculateLevel();
        await user.save();

        // ✅ Save completion record under category
        const newCompletion = {
            user: userId,
            questionsAttempted,
            correctAnswers,
            incorrectAnswers
        };
        category.completions.push(newCompletion);
        await category.save();

        // ✅ Build response
        res.status(201).json({
            message: "✅ Completion recorded successfully!",
            results: {
                correctAnswers,
                incorrectAnswers,
                percentageCorrect: Math.round(percentageCorrect), // integer only
                knowledgeGained: knowledgePointsEarned,
                totalKnowledge: user.knowledgePoints,
                previousLevel,
                currentLevel: user.level
            }
        });


    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
