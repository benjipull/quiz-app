const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();
const INITIAL_BONUS_AMOUNT = 2000; 

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
        // 💰 ONE-TIME COIN GRANT LOGIC FOR EXISTING REGISTERED USERS
        // Ledger tracking for this coin transaction is REMOVED.
        // --------------------------------------------------------
        if (
            user.userType === "Registered" &&
            !user.initialLoginBonusClaimed
        ) {
            user.coins += INITIAL_BONUS_AMOUNT;
            user.initialLoginBonusClaimed = true; // Prevents future claims

            // Ledger logic for initial-grant coin entry removed

            console.log(`🎉 Granted ${INITIAL_BONUS_AMOUNT} coins to existing user ${user.alias} on login.`);
        }
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
        await user.save(); // Save the user with the updated coins/flag and lastlogin_at

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