// routes/admin/updateQuestion.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

// Whitelisted editable fields
const allowedUpdateFields = new Set([
  "text",
  "difficulty_level",
  "correct_answer",
  "validation_verdict",
  "validation_version",
  "popularity",
  "disabled",
  "disabled_reason"
]);

function sanitizePayload(body) {
  const out = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (!allowedUpdateFields.has(key)) continue;

    switch (key) {
      case "text":
      case "correct_answer":
      case "validation_verdict":
      case "disabled_reason":
        out[key] = typeof value === "string" ? value.trim().slice(0, 5000) : "";
        break;

      case "difficulty_level": {
        const n = Number(value);
        out[key] = Number.isFinite(n) ? Math.max(0, Math.min(10, Math.trunc(n))) : 0;
        break;
      }

      case "popularity": {
        const n = Number(value);
        out[key] = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
        break;
      }

      case "validation_version": {
        const n = Number(value);
        out[key] = Number.isFinite(n) ? n : 0;
        break;
      }

      case "disabled":
        out[key] = !!value;
        break;

      default:
        break;
    }
  }
  return out;
}

// PUT /api/admin/questions/:id
router.put("/:id", auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid question ID" });

    const sanitized = sanitizePayload(req.body);
    if (Object.keys(sanitized).length === 0)
      return res.status(400).json({ message: "No valid fields to update" });

    // Build Mongo update document
    const updateDoc = {};
    for (const [k, v] of Object.entries(sanitized)) {
      if (k === "validation_verdict")
        updateDoc["questions.$.validation.final_verdict"] = v;
      else if (k === "validation_version")
        updateDoc["questions.$.validation.validationVersion"] = v;
      else updateDoc[`questions.$.${k}`] = v;
    }

    const match = { "questions._id": id };
    const result = await Category.updateOne(match, { $set: updateDoc });

    if (!result.matchedCount && !result.modifiedCount)
      return res.status(404).json({ message: "Question not found" });

    const category = await Category.findOne(match)
      .select({ _id: 0, questions: { $elemMatch: { _id: id } } })
      .lean();

    if (!category?.questions?.[0])
      return res.status(404).json({ message: "Question not found after update" });

    const q = category.questions[0];

    res.json({
      message: "Updated successfully",
      question: {
        _id: q._id,
        text: q.text,
        difficulty_level: q.difficulty_level,
        correct_answer: q.correct_answer,
        validation_verdict: q.validation?.final_verdict ?? "Not validated",
        validation_version: q.validation?.validationVersion ?? 0,
        popularity: q.popularity ?? 0,
        disabled: q.disabled,
        disabled_reason: q.disabled_reason ?? "",
        createdAt: q.createdAt,
      },
    });
  } catch (err) {
    console.error("Error updating question:", err);
    res.status(500).json({ message: "Server error updating question" });
  }
});

module.exports = router;
