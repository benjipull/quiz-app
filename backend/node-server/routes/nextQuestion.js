const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const { userQuestions } = require("../index");

// Route: Get Current or Next Question for User Token
router.get("/:userToken", async (req, res) => {
  try {
    const { userToken } = req.params;
    const userSession = userQuestions[userToken];

    if (!userSession) {
      console.warn(`No active quiz session for token: ${userToken}`);
      return res.status(404).json({ message: "No more questions available for this token." });
    }

    // If user already has a current question, return it
    if (userSession.current) {
      return res.status(200).json({
        question: userSession.current,
        remaining: userSession.queue.length,
      });
    }

    if (!Array.isArray(userSession.queue) || userSession.queue.length === 0) {
      console.warn(`Question queue exhausted for token: ${userToken}`);
      return res.status(404).json({ message: "No more questions available for this token." });
    }

    // Otherwise, set the first one in queue as current (but don't remove it yet)
    const nextQuestion = userSession.queue[0];
    userSession.current = nextQuestion;

    // Increment timesLoaded in DB
    await Category.findOneAndUpdate(
      { "questions._id": nextQuestion._id },
      { $inc: { "questions.$.timesLoaded": 1 } },
      { new: true }
    );

    return res.status(200).json({
      question: nextQuestion,
      timerInSeconds: 20,
      remaining: userSession.queue.length,
    });
  } catch (error) {
    console.error("Error processing next question request:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
