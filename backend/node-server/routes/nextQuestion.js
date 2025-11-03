const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const { userQuestions } = require("../index");

// Route: Get Current or Next Question for User Token
router.get("/:userToken", async (req, res) => {
    try {
        const { userToken } = req.params;

        // Ensure structure exists
        if (!userQuestions[userToken] || userQuestions[userToken].length === 0) {
            console.warn(`⚠️ No more questions available for token: ${userToken}`);
            return res.status(404).json({ message: "❌ No more questions available for this token." });
        }

        // If user already has a current question, return it
        if (userQuestions[userToken].current) {
            return res.status(200).json({
                question: userQuestions[userToken].current,
                remaining: userQuestions[userToken].queue.length
            });
        }

        // Otherwise, set the first one in queue as current (but don't remove it yet)
        const nextQuestion = userQuestions[userToken].queue[0];
        userQuestions[userToken].current = nextQuestion;

        // Increment timesLoaded in DB
        await Category.findOneAndUpdate(
            { "questions._id": nextQuestion._id },
            { $inc: { "questions.$.timesLoaded": 1 } },
            { new: true }
        );

        return res.status(200).json({
            question: nextQuestion,
            timerInSeconds: 20,
            remaining: userQuestions[userToken].queue.length
        });

    } catch (error) {
        console.error("⚠️ Error processing next question request:", error.message);
        return res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
