const express = require("express");
const router = express.Router();
const Interest = require("../models/interest");
const User = require("../models/user");

// GET all interests
router.get("/", async (req, res) => {
  try {
    const interests = await Interest.find().sort({ name: 1 });
    res.json(interests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching interests" });
  }
});

// UPDATE user's selected interests
router.put("/user/:userId", async (req, res) => {
  try {
    const { interests } = req.body; // array of interest IDs
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { interests },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error updating user interests" });
  }
});

module.exports = router;