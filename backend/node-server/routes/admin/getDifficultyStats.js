const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

// GET /api/admin/questions/difficulty
router.get("/difficulty", auth, adminAuth, async (req, res) => {
  try {
    const results = await Category.aggregate([
      // Flatten all embedded questions from all categories
      { $unwind: "$questions" },

      // Only count enabled (non-disabled) questions
      { $match: { "questions.disabled": { $ne: true } } },

      // Group by difficulty level
      {
        $group: {
          _id: "$questions.difficulty_level",
          count: { $sum: 1 },
        },
      },

      // Sort by difficulty level
      { $sort: { _id: 1 } },
    ]);

    // Optional: human-friendly mapping
    const difficultyMap = { 1: "Easy", 2: "Medium", 3: "Hard" };
    const mapped = results.map((r) => ({
      _id: difficultyMap[r._id] || (r._id !== 0 ? `Level ${r._id}` : "Unknown"),
      count: r.count,
    }));

    res.json(mapped);
  } catch (err) {
    console.error("❌ Error fetching difficulty stats:", err);
    res.status(500).json({ message: "Server error fetching difficulty stats" });
  }
});

module.exports = router;
