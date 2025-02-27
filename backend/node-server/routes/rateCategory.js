const express = require("express");
const Category = require("../models/categoryModel");
const authenticateToken = require("../middleware/auth"); // Middleware for auth

const router = express.Router();

// @route   POST /api/categories/:categoryId/rate
// @desc    Rate a category (1-5 stars)
// @access  Private (Requires Auth)
router.post("/:categoryId/rate", authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { rating } = req.body;
        const userId = req.user.id; // Extracted from JWT token

        // Validate rating (must be between 1 and 5)
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "⚠️ Rating must be between 1 and 5." });
        }

        // Find category
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "❌ Category not found." });
        }

        // ✅ Add rating to the ratings array
        category.ratings.push(rating);

        // ✅ Calculate new average rating (rounded to 2 decimal places)
        const totalRatings = category.ratings.length;
        const sumRatings = category.ratings.reduce((sum, r) => sum + r, 0);
        category.averageRating = parseFloat((sumRatings / totalRatings).toFixed(2));

        // ✅ Save updated category
        await category.save();

        // ✅ Return only the categoryId and new average rating
        res.status(200).json({ 
            message: "✅ Rating submitted successfully!", 
            categoryId: category._id, 
            averageRating: category.averageRating 
        });
        
    } catch (error) {
        console.error("⚠️ Error submitting rating:", error.message);
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
