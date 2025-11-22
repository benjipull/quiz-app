const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const WisdomPointsLedger = require("../models/WisdomPointsLedger");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/**
 * Calculates the coin reward based on correct answers.
 * Range: 10 - 150 coins.
 */
const calculateCoinReward = (correctAnswers) => {
    if (correctAnswers <= 0) return 0;

    // Exponential formula for coin reward
    const rawReward = Math.floor(Math.pow(correctAnswers, 1.3) * 3);
    
    // Ensure reward is within 10 to 150 range
    const coinsEarned = Math.min(150, Math.max(10, rawReward));

    return coinsEarned;
};


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
        
        // --- NEW: Calculate Coin Reward ---
        const coinsEarned = calculateCoinReward(correctAnswers);
        // ---------------------------------

        // --- NEW LEDGER ENTRY LOGIC START (Wisdom Points) ---
        if (knowledgePointsEarned > 0) {
            const newLedgerEntry = new WisdomPointsLedger({
                userId: userId, // User ID from auth middleware
                points: knowledgePointsEarned,
                source: 'quiz-completion'
                // timestamp defaults to Date.now()
            });
            await newLedgerEntry.save();
            console.log(`✨ Recorded ${knowledgePointsEarned} wisdom points for user ${userId}`);
        }
        // --- NEW LEDGER ENTRY LOGIC END ---

        // ✅ Track previous level
        const previousLevel = user.level;

        // ✅ Update user’s points & level
        user.knowledgePoints += knowledgePointsEarned;
        // --- NEW: Update user's coins ---
        user.coins += coinsEarned;
        console.log(`💰 Awarded ${coinsEarned} coins for user ${userId}`);
        // --------------------------------
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
                // --- NEW: COIN RESULTS ---
                coinsEarned: coinsEarned,
                totalCoins: user.coins,
                // -------------------------
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