const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();
// Removed: const INITIAL_BONUS_AMOUNT = 2000; 

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

        // --------------------------------------------------------
        // Removed ONE-TIME COIN GRANT LOGIC (ensuring total coins 
        // for a new registered user is capped at the 2000 from register.js).
        // --------------------------------------------------------

        console.log("User Object on Login:", user); 

        // Generate JWT Token
        const token = jwt.sign(
            {
                id: user._id.toString(),
                alias: user.alias,
                userType: user.userType
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        console.log("Generated Token:", token); // ✅ Log token for debugging

        user.lastlogin_at = Date.now();
        await user.save(); // Save the user with updated lastlogin_at

        // Exclude password field from response
        const { password: _, ...userWithoutPassword } = user.toObject();

        res.json({
            message: "Login successful",
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;