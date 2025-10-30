// routes/admin/adminReports.js
const express = require("express");
const router = express.Router();
const Report = require("../../models/reportModel");
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

// ✅ GET unresolved reports (for active questions only)
router.get("/", auth, adminAuth, async (req, res) => {
  try {
    const reports = await Report.find({ resolved: false })
      .populate("userId", "alias email userType created_at")
      .sort({ createdAt: -1 });

    const reportsWithQuestion = await Promise.all(
      reports.map(async (report) => {
        // Find the category containing this question
        const category = await Category.findOne(
          { "questions._id": report.questionId },
          { "questions.$": 1, name: 1 }
        );

        if (!category || !category.questions?.length) return null;
        const question = category.questions[0];

        // 🔹 Skip disabled questions
        if (question.disabled) return null;

        return {
          _id: report._id,
          question,
          categoryName: category.name,
          user: report.userId,
          reason: report.reason,
          otherText: report.otherText,
          resolved: report.resolved,
          resolutionNotes: report.resolutionNotes,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        };
      })
    );

    // Filter out null (disabled or missing questions)
    const filtered = reportsWithQuestion.filter(Boolean);
    res.json(filtered);
  } catch (err) {
    console.error("❌ Error fetching reports:", err);
    res.status(500).json({ message: "Error fetching reports" });
  }
});

// ✅ PUT /api/admin/reports/:id/resolve
router.put("/:id/resolve", auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body || {};

    const updated = await Report.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolutionNotes: resolutionNotes || "Resolved by admin",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Report not found" });

    res.json({ message: "Report marked as resolved", report: updated });
  } catch (err) {
    console.error("❌ Error resolving report:", err);
    res.status(500).json({ message: "Error resolving report" });
  }
});

module.exports = router;
