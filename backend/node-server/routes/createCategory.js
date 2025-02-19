const express = require("express");
const Category = require("../models/categoryModel");
const { body, validationResult } = require("express-validator");
const authenticateToken = require("../middleware/auth"); // ✅ Middleware to extract user ID
const getImageForCategory = require('../utils/fetchImage');

const router = express.Router();

// @route   POST /api/categories/createCategory
// @desc    Create a new category with createdBy and createdAt
// @access  Private (Requires Auth)
router.post(
    "/createCategory",
    authenticateToken, // ✅ Ensure the user is logged in
    [
        body("name")
            .trim()
            .notEmpty().withMessage("Category name is required")
            .isLength({ min: 3 }).withMessage("Category name must be at least 3 characters long"),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name } = req.body;
            const userId = req.user?.id; // ✅ Extract user ID from JWT token
            console.log("User ID extracted:", userId);

            if (!userId) {
                return res.status(401).json({ message: "⚠️ User ID not found in token" });
            }

            // Fetch image from Unsplash
            let imageUrl = "default-image-url.jpg"; // Default in case fetch fails
            try {
                imageUrl = await getImageForCategory(name) || imageUrl;
            } catch (error) {
                console.error("Failed to fetch category image:", error.message);
            }

            // Check if category already exists (case insensitive)
            const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
            if (existingCategory) {
                return res.status(400).json({ message: "⚠️ Category already exists" });
            }

            // Create new category with createdBy & createdAt
            const category = new Category({
                name,
                createdBy: userId,
                imageUrl: imageUrl
            });

            await category.save();

            res.status(201).json({ message: "✅ Category created successfully", category });
        } catch (error) {
            console.error("⚠️ Server error:", error.message);
            res.status(500).json({ message: "⚠️ Server error", error: error.message });
        }
    }
);


module.exports = router;
