const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

// GET /api/admin/categories/:id/questions
router.get("/:id/questions", auth, adminAuth, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const showDisabled = req.query.showDisabled === "true"; // Default false

    const category = await Category.findById(categoryId)
      .select("name questions")
      .lean();

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // 🧠 Apply server-side filter (default: exclude disabled)
    const filteredQuestions = (category.questions || []).filter(q =>
      showDisabled ? true : !q.disabled
    );

    const questions = filteredQuestions.map(q => ({
      _id: q._id,
      text: q.text,
      version: q.version ?? 1,
      difficulty_level: q.difficulty_level,
      difficulty_rationale: q.difficulty_rationale || "",
      difficultyConfirmedVersion: q.difficultyConfirmedVersion ?? 0,
      disabled: q.disabled,
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
      validation: q.validation || {},
      validation_verdict: q.validation?.final_verdict || "Not validated",
      validation_version: q.validation?.validationVersion ?? 0,
      createdAt: q.createdAt,
      popularity: q.popularity,

      // ✅ Include duplicate info
      duplicate_group_id: q.duplicate?.duplicate_group_id || null,
      duplicate_of: q.duplicate?.duplicate_of || [],
      duplicate_reasoning: q.duplicate?.reasoning || "",
      duplicate_confidence: q.duplicate?.confidence || null,
      duplicate_checked_at: q.duplicate?.last_checked_at || null,

      // ✅ Include new flags for front-end logic
      needs_validation: q.needs_validation ?? false,
      new_question: q.new_question ?? false,

      // ✅ Include answers
      answers:
        q.answers?.map(a => ({
          text: a.text,
          correctCount: a.correctCount || 0
        })) || []
    }));

    res.json({
      categoryName: category.name,
      questionCount: questions.length,
      questions
    });
  } catch (err) {
    console.error("Error fetching category questions:", err);
    res.status(500).json({
      message: "Server error fetching category questions"
    });
  }
});

module.exports = router;
