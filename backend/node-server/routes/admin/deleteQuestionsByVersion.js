const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");
const { parseFiniteNumber } = require("../../utils/numberUtils");

// DELETE /api/admin/questions/by-version/:versionKey
// Deletes all questions for a specific version across all categories, including disabled questions.
router.delete("/by-version/:versionKey", auth, adminAuth, async (req, res) => {
  try {
    const versionKey = String(req.params.versionKey || "").trim();
    if (!versionKey || versionKey.toLowerCase() === "unknown") {
      return res.status(400).json({ message: "Version must be a numeric value." });
    }

    const version = parseFiniteNumber(versionKey, null);
    if (version === null) {
      return res.status(400).json({ message: "Invalid version value." });
    }

    const summary = await Category.aggregate([
      {
        $project: {
          matchedCount: {
            $size: {
              $filter: {
                input: "$questions",
                as: "q",
                cond: { $eq: ["$$q.version", version] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          deletedQuestions: { $sum: "$matchedCount" },
          affectedCategories: {
            $sum: {
              $cond: [{ $gt: ["$matchedCount", 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    const deletedQuestions = Number(summary?.[0]?.deletedQuestions || 0);
    const affectedCategories = Number(summary?.[0]?.affectedCategories || 0);

    if (deletedQuestions === 0) {
      return res.status(404).json({
        message: `No questions found for version ${version}.`,
        version,
        deletedQuestions: 0,
        affectedCategories: 0,
      });
    }

    await Category.updateMany(
      { "questions.version": version },
      { $pull: { questions: { version } } }
    );

    return res.json({
      message: `Deleted ${deletedQuestions} question(s) for version ${version}.`,
      version,
      deletedQuestions,
      affectedCategories,
    });
  } catch (error) {
    console.error("Error deleting questions by version:", error);
    return res.status(500).json({ message: "Server error deleting questions by version." });
  }
});

module.exports = router;
