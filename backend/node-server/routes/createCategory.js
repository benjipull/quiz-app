const express = require("express");
const Category = require("../models/categoryModel");
const { body, validationResult } = require("express-validator");
const authenticateToken = require("../middleware/auth"); // ✅ Middleware to extract user ID
const getImageForCategory = require("../utils/fetchImage"); // ✅ Import image fetch function
const { populateCategory } = require("../scripts/populateCategories"); // ✅ Import async question population

const router = express.Router();

// @route   POST /api/categories/createCategory
// @desc    Create a new category with createdBy, createdAt, and auto-populate questions
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

            // ✅ Fetch image for category
            let imageUrl = "default-image-url.jpg"; // Default image
            try {
                imageUrl = await getImageForCategory(name) || imageUrl;
            } catch (error) {
                console.error("⚠️ Failed to fetch category image:", error.message);
            }

            // ✅ Check if category already exists (case insensitive)
            const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
            if (existingCategory) {
                return res.status(400).json({ message: "⚠️ Category already exists" });
            }

            // ✅ Create category with `disabled: true` (until questions are added)
            const category = new Category({
                name,
                createdBy: userId,
                imageUrl: imageUrl,
                disabled: true, // 🚀 Category starts disabled
            });

            await category.save();

            console.log(`⏳ Populating category: ${category._id} (${name})`);

            async function runPopulateCategory(categoryId, times) {
                for (let i = 0; i < times; i++) {
                    console.log(`🔄 Running populateCategory attempt ${i + 1} for ${name}...`);
                    await populateCategory(categoryId, 1);
                }
            }
            
            // ✅ Run the function asynchronously without blocking other operations
            runPopulateCategory(category._id, 40)
                .then(() => {
                    console.log(`✅ Category ${name} populated 4 times and enabled!`);
                    return Category.findByIdAndUpdate(category._id, { disabled: false }); // ✅ Enable category
                })
                .catch(err => console.error("❌ Error populating category:", err));      

            res.status(201).json({ message: "✅ Category created and populating...", category });
        } catch (error) {
            console.error("⚠️ Server error:", error.message);
            res.status(500).json({ message: "⚠️ Server error", error: error.message });
        }
    }
);

module.exports = router;
