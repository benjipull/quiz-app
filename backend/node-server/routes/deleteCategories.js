const express = require("express");
const Category = require("../models/categoryModel");

const router = express.Router();

// @route   DELETE /api/categories/deleteAll
// @desc    Delete all categories
// @access  Public
router.delete("/deleteAll", async (req, res) => {
    try {
        await Category.deleteMany({});
        res.status(200).json({ message: "✅ All categories deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
