const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

// @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        console.log("User Object on Login:", user);

        // Generate JWT Token
        const token = jwt.sign(
            {
                id: user._id.toString(),
                alias: user.alias
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        console.log("Generated Token:", token); // ✅ Log token for debugging

        res.json({
            message: "Login successful",
            token,
            id: user._id.toString(),
            userAlias: user.alias
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;