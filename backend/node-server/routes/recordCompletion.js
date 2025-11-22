const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const WisdomPointsLedger = require("../models/WisdomPointsLedger"); // ✅ Only Ledger use remains
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// ... (calculateCoinReward and calculateKnowledgePoints helpers)
const calculateCoinReward = (correctAnswers) => {
    if (correctAnswers <= 0) return 0;
    const rawReward = Math.floor(Math.pow(correctAnswers, 1.3) * 3); 
    const coinsEarned = Math.min(150, Math.max(10, rawReward));
    return coinsEarned;
};

const calculateKnowledgePoints = (correct, incorrect) => {
    // Example: 10 points per correct answer, -5 per incorrect.
    return (correct * 10) - (incorrect * 5); 
};


router.post("/:categoryId/completion", authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { questionsAttempted, correctAnswers, incorrectAnswers } = req.body;
        const userId = req.user.id;

        // ... (validation logic)

        const user = await User.findById(userId);
        const category = await Category.findById(categoryId);

        // ... (not found logic)

        // Calculate reward and XP
        const coinsEarned = calculateCoinReward(correctAnswers);
        const knowledgePointsEarned = calculateKnowledgePoints(correctAnswers, incorrectAnswers);
        const previousLevel = user.level;
        const percentageCorrect = (correctAnswers / questionsAttempted) * 100;

        // Apply reward and XP to user
        user.knowledgePoints += knowledgePointsEarned;
        user.coins += coinsEarned;
        
        // 🧠 RECORDING KNOWLEDGE POINTS ONLY
        const rewardLedger = new WisdomPointsLedger({
            userId: userId,
            points: knowledgePointsEarned, // This is the Knowledge Points (XP)
            source: 'quiz-completion' 
        });
        await rewardLedger.save(); 

        user.level = user.calculateLevel();
        await user.save();

        // ... (Save completion record and build response)

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