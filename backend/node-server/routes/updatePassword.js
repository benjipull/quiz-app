const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");

const router = express.Router();

// 📌 POST: Update Password
router.post("/", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required." });
    }

    try {
        // ✅ Hash the received token (to match what was stored)
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // ✅ Find user by the hashed token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired token." });
        }

        // ✅ Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.updateOne(
            { _id: user._id },
            { 
                $set: {
                    password: hashedPassword,
                    resetPasswordToken: undefined,
                    resetPasswordExpires: undefined
                }
            }
        );
       

        res.status(200).json({ message: "Password successfully updated!" });
    } catch (error) {
        console.error("Password Update Error:", error);
        return res.status(500).json({ error: "Something went wrong." });
    }
});

module.exports = router;
