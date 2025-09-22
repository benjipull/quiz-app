const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const { userQuestions } = require("../index");

// Route: Submit Answer
router.post("/:userToken", async (req, res) => {
    try {
        const { userToken } = req.params;
        const { answer } = req.body;

        // Ensure user session exists
        if (!userQuestions[userToken] || !userQuestions[userToken].current) {
            return res.status(400).json({ message: "❌ No active question for this user token." });
        }

        const currentQuestion = userQuestions[userToken].current;
        const isCorrect = currentQuestion.correct_answer === answer;

        // --- 1. Update question-level counters ---
        const questionUpdate = isCorrect
            ? { $inc: { "questions.$.timesAnsweredCorrectly": 1 } }
            : { $inc: { "questions.$.timesAnsweredIncorrectly": 1 } };

        await Category.findOneAndUpdate(
            { "questions._id": currentQuestion._id },
            questionUpdate
        );

        // --- 2. Update per-answer counters ---
        const answerUpdate = isCorrect
            ? { $inc: { "questions.$.answers.$[ans].correctCount": 1 } }
            : { $inc: { "questions.$.answers.$[ans].incorrectCount": 1 } };

        await Category.findOneAndUpdate(
            { "questions._id": currentQuestion._id },
            answerUpdate,
            { arrayFilters: [{ "ans.text": answer }] }
        );

        // --- 3. Fetch updated question ---
        const updatedCategory = await Category.findOne(
            { "questions._id": currentQuestion._id },
            { "questions.$": 1 }
        );

        if (!updatedCategory || !updatedCategory.questions || updatedCategory.questions.length === 0) {
            return res.status(404).json({ message: "❌ Question not found after update." });
        }

        const updatedQuestion = updatedCategory.questions[0];

        // --- 4. Build per-answer stats ---
        const answerStats = updatedQuestion.answers.map(ans => {
            const total = (ans.correctCount || 0) + (ans.incorrectCount || 0);
            return {
                text: ans.text,
                correctPercentage: total > 0 ? Math.round((ans.correctCount / total) * 100) : 0,
                incorrectPercentage: total > 0 ? Math.round((ans.incorrectCount / total) * 100) : 0
            };
        });

        // --- 5. Remove question from queue & reset current ---
        userQuestions[userToken].queue.shift();
        userQuestions[userToken].current = null;

        // Example: earned items (stub)
        const earnedItems = isCorrect ? ["⭐ Knowledge Point"] : [];

        return res.status(200).json({
            questionId: currentQuestion.questionId,
            question: currentQuestion.question,
            correctAnswer: currentQuestion.correct_answer,
            explanation: currentQuestion.explanation,
            isCorrect,
            answerStats,
            earnedItems,
            remaining: userQuestions[userToken].queue.length
        });

    } catch (error) {
        console.error("⚠️ Error submitting answer:", error.message);
        return res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
