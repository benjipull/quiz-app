const express = require("express");
const router = express.Router();
const User = require("../models/user");
// const authenticateToken = require("../middleware/auth"); // Uncomment if needed

// 📌 GET: Get all users
router.get("/all", async (req, res) => {
  try {
    // Fetch all users, exclude password and sensitive fields
    const users = await User.find().select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error.message);
    res.status(500).json({ error: "Server error. Failed to fetch users." });
  }
});

module.exports = router;
