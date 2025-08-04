const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel"); // ✅ Import Category model
const { userQuestions } = require("../index"); // ✅ Import shared store

// ✅ Route: Get Next Question for User Token & Increment `timesLoaded`
router.get("/:userToken", async (req, res) => {
    try {
        const { userToken } = req.params;

        if (!userToken) {
            console.error("❌ Invalid request: Missing user token.");
            return res.status(400).json({ message: "❌ User token is required." });
        }

        // ✅ Check if questions exist for this user token
        if (!userQuestions[userToken] || userQuestions[userToken].length === 0) {
            console.warn(`⚠️ No more questions available for token: ${userToken}`);
            return res.status(404).json({ message: "❌ No more questions available for this token." });
        }

        // ✅ Retrieve the next question from memory
        const nextQuestion = userQuestions[userToken].shift(); // Removes & returns the first question

        // ✅ Find the category and update the `timesLoaded` value for this question in MongoDB
        const updatedCategory = await Category.findOneAndUpdate(
            { "questions._id": nextQuestion._id }, // ✅ Find the question by ID
            { $inc: { "questions.$.timesLoaded": 1 } }, // ✅ Increment `timesLoaded`
            { new: true } // ✅ Return updated document
        );

        if (!updatedCategory) {
            console.error(`❌ Failed to update timesLoaded for question ID: ${nextQuestion._id}`);
        } else {
            console.log(`✅ Incremented timesLoaded for question ID: ${nextQuestion._id}`);
        }

        // ✅ Send the next question
        return res.status(200).json({ question: nextQuestion, remaining: userQuestions[userToken].length });

    } catch (error) {
        console.error("⚠️ Error processing next question request:", error.message);
        return res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
