require("dotenv").config();
const express = require("express");
const { Resend } = require("resend");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/user"); 

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// 🚀 Rate Limiting (Max 5 requests per 1 hour per IP)
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: "Too many reset requests. Try again later." },
});
router.use("/", limiter);

// 📌 POST: Send Password Reset Email
router.post("/", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }

    try {
        // ✅ Check if user exists in DB
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({ message: "If your email exists, a reset link will be sent." });
        }

        // ✅ Generate a secure reset token
        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.RESET_SECRET, // Use a strong secret key
            { expiresIn: "1h" } // Token expires in 1 hour
        );

        // ✅ Store the hashed token in the database (instead of plain text)
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        await User.updateOne(
            { _id: user._id },
            { resetPasswordToken: hashedToken, resetPasswordExpires: Date.now() + 3600000 }
        );

        // ✅ Secure reset link (frontend should verify the token)
        const resetLink = `https://quiz-app-node-606998948537.europe-west4.run.app/reset-password.html?token=${resetToken}`;

        // ✅ Send Email using Resend
        const data = await resend.emails.send({
            from: `Quizicle Support Team <${process.env.SENDER_EMAIL}>`,
            to: [email],
            subject: "Password Reset Request",
            html: `
                <p>Hello,</p>
                <p>Click the link below to reset your password:</p>
                <a href="${resetLink}">${resetLink}</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Thanks,</p>
                <p>Your Quizicle Support Team</p>
            `,
        });

        console.log("Email sent:", data);
        return res.status(200).json({ message: "If your email exists, a reset link will be sent." });
    } catch (error) {
        console.error("Resend Error:", error);
        return res.status(500).json({ error: "Failed to send reset email" });
    }
});

module.exports = router;
