const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        // Generate a random code for uniqueness
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Auto-generated guest details
        const alias = `Guest_${code}`;
        const email = `${code}@quizicle.com`;
        const password = code; // random guest password (hashed in schema)
        const age = 1;
        const userType = "Guest";

        // Create new user
        const newUser = new User({ alias, email, password, age, userType });
        await newUser.save();

        // Generate JWT Token
        const token = jwt.sign(
            { id: newUser._id.toString(), alias: newUser.alias },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        // Update last login
        newUser.lastlogin_at = new Date();
        await newUser.save();

        // Exclude password before returning
        const { password: _, ...userWithoutPassword } = newUser.toObject();

        res.json({
            message: "Guest registration and login successful",
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error("⚠️ Server Error:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
