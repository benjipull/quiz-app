const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

// PUT /api/admin/questions/:questionId/unmark-duplicate
router.put("/:questionId/unmark-duplicate", auth, adminAuth, async (req, res) => {
  const { questionId } = req.params;

  try {
    const category = await Category.findOne({ "questions._id": questionId });
    if (!category)
      return res.status(404).json({ message: "Question not found" });

    
    
    const result = await Category.updateOne(
      { "questions._id": questionId },
      {
        $set: {
          "questions.$.duplicate.duplicate_group_id": null,
          "questions.$.duplicate.duplicate_of": [],
          "questions.$.duplicate.reasoning": "Manually marked as non duplicate",
          "questions.$.duplicate.confidence": null,
          "questions.$.duplicate.last_checked_at": new Date(),
          "questions.$.disabled": false,
          "questions.$.disabled_reason": "",
          "questions.$.new_question": false,
          "questions.$.needs_validation": false
        }
      }
    );

    if (result.modifiedCount === 0)
      return res.status(400).json({ message: "No changes made" });

    res.json({
      message: "✅ Question unmarked as duplicate and cleared as reviewed",
      questionId
    });
  } catch (err) {
    console.error("❌ Error clearing duplicate group:", err);
    res.status(500).json({ message: "Server error clearing duplicate group" });
  }
});

module.exports = router;
