require("dotenv").config();
const express = require("express");
const User = require("../models/user"); 
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;  

        // Validate if the ID is a valid MongoDB ObjectId
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid user ID format." });
        }

        // Find the user by ID (excluding password for security)
        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error("❌ Error fetching user:", error);
        return res.status(500).json({ error: "Server error. Please try again later." });
    }
});

module.exports = router;
