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

        // --- 1. Increment selected answer counter ---
        await Category.findOneAndUpdate(
            { "questions._id": currentQuestion._id },
            { $inc: { "questions.$.answers.$[ans].correctCount": 1 } },
            { arrayFilters: [{ "ans.text": answer.trim() }], new: true }
        );


        // --- 2. Fetch updated question ---
        const updatedCategory = await Category.findOne(
            { "questions._id": currentQuestion._id },
            { "questions.$": 1 }
        );

        if (!updatedCategory || !updatedCategory.questions || updatedCategory.questions.length === 0) {
            return res.status(404).json({ message: "❌ Question not found after update." });
        }

        const updatedQuestion = updatedCategory.questions[0];

        // --- 3. Build per-answer stats ---
        const totalSelections = updatedQuestion.answers.reduce(
            (sum, ans) => sum + (ans.correctCount || 0),
            0
        );

        const answerStats = updatedQuestion.answers.map(ans => ({
            text: ans.text,
            percentage:
                totalSelections > 0
                    ? Math.round(((ans.correctCount || 0) / totalSelections) * 100)
                    : 0
        }));

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
