const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

// GET /api/admin/duplicates/:groupId
router.get("/:groupId", auth, adminAuth, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ message: "Missing duplicate group ID" });
    }

    // ✅ Use aggregation instead of simple find to pull *all* matching questions
    const pipeline = [
      { $unwind: "$questions" },
      { $match: { "questions.duplicate.duplicate_group_id": groupId } },
      {
        $project: {
          _id: 0,
          categoryName: "$name",
          questionId: "$questions._id",
          text: "$questions.text",
          difficulty_level: "$questions.difficulty_level",
          disabled: "$questions.disabled",
          correct_answer: "$questions.correct_answer",
          explanation: "$questions.explanation",
          validation_verdict: "$questions.validation.final_verdict",
          popularity: "$questions.popularity",
          createdAt: "$questions.createdAt",
          duplicate_group_id: "$questions.duplicate.duplicate_group_id",
          duplicate_of: "$questions.duplicate.duplicate_of",
          duplicate_reasoning: "$questions.duplicate.reasoning",
          duplicate_confidence: "$questions.duplicate.confidence",
          duplicate_checked_at: "$questions.duplicate.last_checked_at",
          answers: "$questions.answers"
        }
      },
      { $sort: { categoryName: 1, createdAt: 1 } }
    ];

    const results = await Category.aggregate(pipeline);

    if (!results.length) {
      return res.status(404).json({
        message: `No questions found for duplicate group ID "${groupId}"`,
      });
    }

    res.json({
      groupId,
      totalQuestions: results.length,
      questions: results,
    });
  } catch (err) {
    console.error("Error fetching duplicate group questions:", err);
    res.status(500).json({
      message: "Server error fetching duplicate group questions",
    });
  }
});

module.exports = router;
