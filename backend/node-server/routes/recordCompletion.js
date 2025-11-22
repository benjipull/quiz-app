const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const WisdomPointsLedger = require("../models/WisdomPointsLedger"); // 🚨 KEEP: Used for Knowledge Points
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/**
 * Calculates the coin reward based on correct answers.
 * Range: 10 - 150 coins.
 */
const calculateCoinReward = (correctAnswers) => {
    if (correctAnswers <= 0) return 0;

    // Exponential formula for coin reward (using original *3 from snippet)
    const rawReward = Math.floor(Math.pow(correctAnswers, 1.3) * 3); 
    
    // Ensure reward is within 10 to 150 range
    const coinsEarned = Math.min(150, Math.max(10, rawReward));

    return coinsEarned;
};

// Assuming you have this helper function for XP/Knowledge Points
const calculateKnowledgePoints = (correct, incorrect) => {
    // Example: 10 points per correct answer, -5 per incorrect.
    return (correct * 10) - (incorrect * 5); 
};


router.post("/:categoryId/completion", authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { questionsAttempted, correctAnswers, incorrectAnswers } = req.body;
        const userId = req.user.id;

        console.log("✅ Received categoryId:", categoryId);
        console.log("✅ Extracted User ID:", userId);

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: "Invalid category ID format." });
        }

        const user = await User.findById(userId);
        const category = await Category.findById(categoryId);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        // Calculate reward and XP
        const coinsEarned = calculateCoinReward(correctAnswers);
        const knowledgePointsEarned = calculateKnowledgePoints(correctAnswers, incorrectAnswers);
        const previousLevel = user.level;
        const percentageCorrect = (correctAnswers / questionsAttempted) * 100;

        // Apply reward and XP to user
        user.knowledgePoints += knowledgePointsEarned;
        user.coins += coinsEarned;
        console.log(`💰 Awarded ${coinsEarned} coins for user ${userId}`);
        
        // Record the Knowledge Points reward in the Ledger (Source: 'quiz-completion')
        const rewardLedger = new WisdomPointsLedger({
            userId: userId,
            points: knowledgePointsEarned, // Recording Knowledge Points (XP)
            source: 'quiz-completion' 
        });
        await rewardLedger.save(); // <-- THIS REMAINS (for Knowledge Points)

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
                coinsEarned: coinsEarned,
                totalCoins: user.coins,
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