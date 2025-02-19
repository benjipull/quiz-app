const express = require("express");
const User = require("../models/user");

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Public
router.get("/", async (req, res) => {
    try {
        const users = await User.find({}, "-password"); // Exclude passwords for security
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "⚠️ Server error", error: error.message });
    }
});

module.exports = router;
