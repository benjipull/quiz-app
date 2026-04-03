const express = require("express");
const Category = require("../models/categoryModel");

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories that are not disabled, with image64 and completion count.
// @access  Public
router.get("/", async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $match: { disabled: { $ne: true } },
      },
      {
        $addFields: {
          completionsCount: { $size: { $ifNull: ["$completions", []] } },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $unwind: {
          path: "$creator",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: 1,
          image64: 1,
          completionsCount: 1,
          averageRating: 1,
          createdAt: 1,
          createdBy: {
            $ifNull: ["$creator.alias", "Unknown"],
          },
        },
      },
    ]);

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
