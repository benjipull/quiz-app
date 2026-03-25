const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const User = require("../models/user");
const WisdomPointsLedger = require("../models/WisdomPointsLedger"); 
const SagaLevelProgression = require("../models/SagaLevelProgression");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// --- REWARD CALCULATION LOGIC ---

/**
 * Calculates the coin reward based on correct answers and total questions.
 * Range: 10 - 150 coins.
 * Uses a dynamic exponential formula based on percentage correct to allow scaling with quiz length.
 */
const calculateCoinReward = (correctAnswers, questionsAttempted) => {
    if (correctAnswers <= 0 || questionsAttempted <= 0) return 0;

    // Normalize score to a 0-10 scale regardless of total questions (N)
    const scoreScale = (correctAnswers / questionsAttempted) * 10; 

    // Exponential formula: (ScoreScale ^ 1.3) * Multiplier (7.6)
    // Multiplier of 7.6 ensures 100% correct (ScoreScale=10) hits the max cap of 150.
    const rawReward = Math.floor(Math.pow(scoreScale, 1.3) * 7.6);
    
    // Ensure reward is within 10 to 150 range
    const coinsEarned = Math.min(150, Math.max(10, rawReward));

    return coinsEarned;
};

/**
 * Calculates Knowledge Points (XP) using an exponential formula based ONLY on
 * correct answers to reward mastery and avoid negative scores.
 */
const calculateKnowledgePoints = (correct) => {
    // Formula: floor(correctAnswers ^ 1.2 * 5)
    if (correct <= 0) return 0;
    return Math.floor(Math.pow(correct, 1.2) * 5); 
};


// --- ROUTE HANDLER ---

router.post("/:categoryId/completion", authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { questionsAttempted, correctAnswers, incorrectAnswers, sagaLevelId, sagaNumber } = req.body;
        const userId = req.user.id;

        console.log("✅ Received categoryId:", categoryId);
        console.log("✅ Extracted User ID:", userId);

        // --- VALIDATION ---
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: "❌ Invalid category ID format." });
        }
        if (questionsAttempted == null || correctAnswers == null || incorrectAnswers == null) {
            return res.status(400).json({ message: "⚠️ All fields are required." });
        }
        if (questionsAttempted <= 0) {
            return res.status(400).json({ message: "Questions attempted must be greater than zero." });
        }
        const parsedSagaNumber = Number.parseInt(String(sagaNumber || ""), 10);
        const requestedSagaNumber =
            Number.isInteger(parsedSagaNumber) && parsedSagaNumber > 0
                ? parsedSagaNumber
                : null;

        const user = await User.findById(userId);
        const category = await Category.findById(categoryId);

        if (!user) {
            return res.status(404).json({ message: "❌ User not found." });
        }
        if (!category) {
            return res.status(404).json({ message: "❌ Category not found." });
        }


        // --- REWARD CALCULATION ---
        const coinsEarned = calculateCoinReward(correctAnswers, questionsAttempted);
        
        // Use the corrected, positive-only logic
        const knowledgePointsEarned = calculateKnowledgePoints(correctAnswers); 
        
        const previousLevel = user.level;
        const percentageCorrect = (correctAnswers / questionsAttempted) * 100;

        // --- APPLY REWARDS ---
        user.knowledgePoints += knowledgePointsEarned;
        user.coins += coinsEarned;
        user.quizzesCompleted = Number(user.quizzesCompleted || 0) + 1;
        
        // 🧠 RECORDING KNOWLEDGE POINTS TO LEDGER
        if (knowledgePointsEarned > 0) {
            const rewardLedger = new WisdomPointsLedger({
                userId: userId,
                points: knowledgePointsEarned, // Knowledge Points (XP)
                source: 'quiz-completion' 
            });
            await rewardLedger.save(); 
            console.log(`✨ Recorded ${knowledgePointsEarned} wisdom points for user ${userId}`);
        }

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
        
        // ✅ If this category is part of a saga level for the player,
        // mark the first matching saga-level entry as completed.
        const hasValidSagaLevelId =
            sagaLevelId != null &&
            sagaLevelId !== "" &&
            mongoose.Types.ObjectId.isValid(sagaLevelId);
        const sagaLevelObjectId = hasValidSagaLevelId
            ? new mongoose.Types.ObjectId(sagaLevelId)
            : null;
        const sagaProgression = await SagaLevelProgression.findOne({ player: userId });

        if (sagaProgression && Array.isArray(sagaProgression.sagas)) {
            let updatedSagaLevel = false;

            const orderedSagas = [...sagaProgression.sagas].sort(
                (a, b) => Number(a?.sagaNumber || 0) - Number(b?.sagaNumber || 0)
            );
            const prioritizedSagas = requestedSagaNumber
                ? [
                    ...orderedSagas.filter(
                        (saga) => Number(saga?.sagaNumber || 0) === requestedSagaNumber
                    ),
                    ...orderedSagas.filter(
                        (saga) => Number(saga?.sagaNumber || 0) !== requestedSagaNumber
                    ),
                  ]
                : [...orderedSagas].reverse();

            for (const saga of prioritizedSagas) {
                if (!Array.isArray(saga.sagaLevels)) continue;

                let matchingLevel = null;

                if (sagaLevelObjectId) {
                    matchingLevel =
                        saga.sagaLevels.find((level) =>
                            String(level?._id) === String(sagaLevelObjectId) &&
                            String(level?.category) === String(categoryId)
                        ) || null;
                }

                if (!matchingLevel) {
                    matchingLevel =
                        saga.sagaLevels.find(
                            (level) =>
                                String(level?.category) === String(categoryId) && !level?.isCompleted
                        ) ||
                        saga.sagaLevels.find(
                            (level) => String(level?.category) === String(categoryId)
                        ) ||
                        null;
                }

                // If an explicit sagaLevelId was provided but not found in its saga,
                // allow a broader category-based fallback in other sagas.
                if (!matchingLevel && sagaLevelObjectId && !requestedSagaNumber) {
                    matchingLevel =
                        saga.sagaLevels.find(
                            (level) =>
                                String(level?.category) === String(categoryId) && !level?.isCompleted
                        ) ||
                        saga.sagaLevels.find(
                            (level) => String(level?.category) === String(categoryId)
                        ) ||
                        null;
                }

                if (matchingLevel) {
                    matchingLevel.isCompleted = true;
                    matchingLevel.completionRating = Number(correctAnswers) || 0;
                    updatedSagaLevel = true;
                    break;
                }
            }

            if (updatedSagaLevel) {
                await sagaProgression.save();
            }
        }


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
                totalQuizzesCompleted: user.quizzesCompleted,
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
