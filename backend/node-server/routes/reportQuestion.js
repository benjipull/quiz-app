const express = require("express");
const router = express.Router();
const Report = require("../models/reportModel");
const authenticateToken = require("../middleware/auth");

// POST /api/reports
router.post("/", authenticateToken, async (req, res) => {
  try {

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: invalid token." });
    }

    const { questionId, reason, otherText } = req.body;

    if (!questionId || !userId || !reason) {
      return res.status(400).json({
        message: "questionId, and reason are required.",
      });
    }

    const validReasons = [
      "incorrect_answer",
      "ambiguous_wording",
      "duplicate_question",
      "offensive_content",
      "multiple_correct_answers",
      "other",
    ];
    
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ message: "Invalid report reason." });
    }

    const report = new Report({ questionId, userId, reason, otherText });
    await report.save();

    res.status(201).json({ message: "Report submitted successfully." });
  } catch (err) {
    console.error("❌ Error creating report:", err);
    res.status(500).json({ message: "Failed to submit report." });
  }
});

module.exports = router;
