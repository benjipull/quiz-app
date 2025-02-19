const express = require("express");
const Category = require("../models/categoryModel");

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories with imageUrl, completion count, and creator's full name
// @access  Public
router.get("/", async (req, res) => {
    try {
        const categories = await Category.aggregate([
            {
                $addFields: {
                    completionsCount: { $size: { $ifNull: ["$completions", []] } } // ✅ Count completions
                }
            },
            {
                $lookup: {
                    from: "users", // ✅ Collection name in MongoDB (must match actual collection)
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "creator"
                }
            },
            {
                $unwind: {
                    path: "$creator",
                    preserveNullAndEmptyArrays: true // ✅ Keep categories even if user data is missing
                }
            },
            {
                $project: {
                    name: 1,           // ✅ Include category name
                    imageUrl: 1,       // ✅ Include category image URL
                    completionsCount: 1, // ✅ Include completion count
                    createdAt: 1,      // ✅ Include created date
                    createdBy: 1,      // ✅ Keep createdBy ID
                    creatorName: "$creator.full_name" // ✅ Extract full name from joined user document
                }
            }
        ]);

        res.status(200).json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error.message);
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
