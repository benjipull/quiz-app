const express = require("express");
const Category = require("../models/categoryModel");

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories that are NOT disabled, with imageUrl, completion count, and creator's alias
// @access  Public
router.get("/", async (req, res) => {
    try {
        const categories = await Category.aggregate([
            {
                $match: { disabled: { $ne: true } } // ✅ Exclude disabled categories
            },
            {
                $addFields: {
                    completionsCount: { $size: { $ifNull: ["$completions", []] } } // ✅ Count completions
                }
            },
            {
                $lookup: {
                    from: "users", // ✅ Ensure this matches your users collection name
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
                    name: 1,            // ✅ Include category name
                    imageUrl: 1,        // ✅ Include category image URL
                    completionsCount: 1,// ✅ Include completion count
                    averageRating: 1,
                    createdAt: 1,       // ✅ Include created date
                    createdBy: { 
                        $ifNull: ["$creator.alias", "Unknown"] // ✅ Replace `createdBy` with alias (or "Unknown" if missing)
                    }
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
