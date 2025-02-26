const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel"); // ✅ Import Category model

// @route   POST /api/questions/updatePopularity
// @desc    Increase or decrease question popularity
// @access  Public
router.post("/", async (req, res) => {
    const { questionId, action } = req.body;

    if (!questionId || ![1, 2].includes(action)) {
        return res.status(400).json({ message: "❌ Invalid request. Provide a valid questionId and action (1 for like, 2 for dislike)." });
    }

    try {
        // ✅ Find the category containing the question
        const category = await Category.findOne({ "questions._id": questionId });

        if (!category) {
            return res.status(404).json({ message: "❌ Question not found." });
        }

        // ✅ Find the question inside the category
        const question = category.questions.id(questionId);

        if (!question) {
            return res.status(404).json({ message: "❌ Question not found." });
        }

        // ✅ Update popularity based on action
        if (action === 1) {
            question.popularity += 1; // 👍 Like
        } else if (action === 2) {
            question.popularity -= 1; // 👎 Dislike
        }

        // ✅ Save the updated category
        await category.save();

        return res.status(200).json({ message: "✅ Popularity updated successfully!", popularity: question.popularity });
    } catch (error) {
        console.error("❌ Error updating popularity:", error.message);
        return res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
