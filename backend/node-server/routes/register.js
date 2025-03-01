const express = require("express");
const User = require("../models/user");

const router = express.Router();

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post("/", async (req, res) => {
    try {
        const { alias, email, password, age } = req.body;

        // Validate input (Ensure all fields are filled)
        if (!alias || !email || !password || !age) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if user email or alias already exists
        let emailExists = await User.findOne({ email });
        let aliasExists = await User.findOne({ alias });

        if (emailExists) {
            return res.status(400).json({ message: "Email already exists" });
        }
        if (aliasExists) {
            return res.status(400).json({ message: "Alias already exists" });
        }

        // Create new user
        const newUser = new User({ alias, email, password, age });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("⚠️ Server Error:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
