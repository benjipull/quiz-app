const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/my-categories
// @desc    Get all categories created by the logged-in user
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // extracted from JWT
        const userObjectId = new mongoose.Types.ObjectId(userId); // ✅ convert to ObjectId

        const categories = await Category.aggregate([
            {
                $match: { 
                    disabled: { $ne: true }, 
                    createdBy: userObjectId // ✅ use ObjectId for matching
                }
            },
            {
                $addFields: {
                    completionsCount: { $size: { $ifNull: ["$completions", []] } }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "creator"
                }
            },
            {
                $unwind: {
                    path: "$creator",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    name: 1,
                    imageUrl: 1,
                    completionsCount: 1,
                    averageRating: 1,
                    createdAt: 1,
                    createdBy: { 
                        $ifNull: ["$creator.alias", "Unknown"]
                    }
                }
            }
        ]);

        res.status(200).json(categories);
    } catch (error) {
        console.error("Error fetching user categories:", error.message);
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
