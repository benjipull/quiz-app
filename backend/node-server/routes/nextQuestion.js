const express = require("express");
const router = express.Router();
const { userQuestions } = require("../index"); // ✅ Import shared store

// ✅ Route: Get Next Question for User Token
router.get("/:userToken", (req, res) => {
    try {
        const { userToken } = req.params;

        console.log(`📌 Request received for next question (Token: ${userToken})`);

        // ✅ Validate userToken
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

        console.log(`✅ Serving next question for token: ${userToken}`);
        console.log("➡️ Next Question:", nextQuestion);

        // ✅ Send the next question
        return res.status(200).json({ question: nextQuestion, remaining: userQuestions[userToken].length });

    } catch (error) {
        console.error("⚠️ Error processing next question request:", error.message);
        return res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
