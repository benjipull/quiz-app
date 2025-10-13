const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

// PUT /api/admin/questions/:questionId/mark-duplicate
router.put("/:questionId/mark-duplicate", auth, adminAuth, async (req, res) => {
  try {
    const { questionId } = req.params;

    // 🧠 Find which category contains this question
    const category = await Category.findOne({ "questions._id": questionId });
    if (!category) {
      return res.status(404).json({ message: "Question not found" });
    }

    // 🛠️ Disable the question and set reason
    const result = await Category.updateOne(
      { _id: category._id },
      {
        $set: {
          "questions.$[elem].disabled": true,
          "questions.$[elem].disabled_reason": "Marked as duplicate",
        },
      },
      {
        arrayFilters: [{ "elem._id": questionId }],
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "Question not updated" });
    }

    res.json({
      message: "Question marked as duplicate and disabled",
      categoryId: category._id,
      questionId,
      disabled_reason: "Marked as duplicate",
    });
  } catch (err) {
    console.error("❌ Error marking question as duplicate:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
