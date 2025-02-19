const express = require("express");
const Category = require("../models/categoryModel");
const authenticateToken = require("../middleware/auth"); // ✅ Middleware to get user from token

const router = express.Router();

// @route   POST /api/categories/:categoryId/completion
// @desc    Save quiz completion data for a category
// @access  Private (Requires authentication)
router.post("/:categoryId/completion", authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { questionsAttempted, correctAnswers, incorrectAnswers } = req.body;
        
        const userId = req.user.id; // ✅ Extracted from JWT
        console.log("User ID extracted:", userId);

        if (!userId) {
            return res.status(401).json({ message: "⚠️ User ID not found in token" });
        }
        
        // Validate required fields
        if (questionsAttempted == null || correctAnswers == null || incorrectAnswers == null) {
            return res.status(400).json({ message: "⚠️ All fields are required." });
        }

        // Find category
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "❌ Category not found" });
        }

        // Add new completion record
        const newCompletion = {
            user: userId, // ✅ Use user ID from JWT
            questionsAttempted,
            correctAnswers,
            incorrectAnswers
        };

        category.completions.push(newCompletion);
        await category.save(); // ✅ Save to database

        res.status(201).json({ message: "✅ Completion recorded successfully!", category });
    } catch (error) {
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
