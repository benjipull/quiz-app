const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");
const {
  getDifficultyLabel,
  getDifficultyLabelsByKey,
  normalizeDifficultyLevel,
  UNKNOWN_DIFFICULTY_KEY,
  UNKNOWN_DIFFICULTY_LABEL,
} = require("../../config/difficultyLevels");

// GET /api/admin/questions/difficulty
router.get("/difficulty", auth, adminAuth, async (req, res) => {
  try {
    const extended = req.query.extended === "true";

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

    const mapped = results
      .map((row) => {
        const normalized = normalizeDifficultyLevel(row._id);
        const label = getDifficultyLabel(normalized);
        const isKnownLevel = label !== UNKNOWN_DIFFICULTY_LABEL;
        const key = isKnownLevel ? String(normalized) : UNKNOWN_DIFFICULTY_KEY;
        return {
          key,
          level: isKnownLevel ? normalized : null,
          label,
          count: Number(row.count || 0),
        };
      })
      .sort((a, b) => {
        const aUnknown = a.level === null;
        const bUnknown = b.level === null;
        if (aUnknown && bUnknown) return 0;
        if (aUnknown) return 1;
        if (bUnknown) return -1;
        return a.level - b.level;
      });

    // Keep `_id` for backward compatibility with existing admin clients.
    const legacyArray = mapped.map((item) => ({
      _id: item.label,
      key: item.key,
      level: item.level,
      label: item.label,
      count: item.count,
    }));

    if (!extended) {
      return res.json(legacyArray);
    }

    return res.json({
      labelsByLevel: getDifficultyLabelsByKey(),
      levels: mapped,
      items: legacyArray,
    });
  } catch (err) {
    console.error("❌ Error fetching difficulty stats:", err);
    res.status(500).json({ message: "Server error fetching difficulty stats" });
  }
});

module.exports = router;
