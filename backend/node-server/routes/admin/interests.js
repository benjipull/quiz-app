const express = require("express");
const mongoose = require("mongoose");
const Interest = require("../../models/interest");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");
const { normalizeWhitespace, escapeRegExp } = require("../../utils/stringUtils");

const router = express.Router();

// GET /api/admin/interests
router.get("/", auth, adminAuth, async (req, res) => {
  try {
    const interests = await Interest.find().sort({ name: 1 }).lean();
    res.json(interests);
  } catch (err) {
    console.error("Error fetching interests:", err);
    res.status(500).json({ message: "Server error fetching interests" });
  }
});

// PUT /api/admin/interests/:id
router.put("/:id", auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid interest id" });
    }

    const name = normalizeWhitespace(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Interest name is required" });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: "Interest name must be 100 characters or less" });
    }

    const duplicate = await Interest.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${escapeRegExp(name)}$`, "i") },
    })
      .select("_id")
      .lean();

    if (duplicate) {
      return res.status(409).json({ message: "Another interest already uses this name" });
    }

    const updated = await Interest.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Interest not found" });
    }

    res.json({ message: "Interest updated", interest: updated });
  } catch (err) {
    console.error("Error updating interest:", err);

    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Interest name must be unique" });
    }

    res.status(500).json({ message: "Server error updating interest" });
  }
});

module.exports = router;
