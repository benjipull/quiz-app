require("dotenv").config();
const express = require("express");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { alias, age, avatar, email } = req.body;

        // ✅ Find user first
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // ✅ Basic validation
        if (alias && typeof alias !== "string") {
            return res.status(400).json({ error: "Invalid alias." });
        }
        if (age && (isNaN(age) || age < 1)) {
            return res.status(400).json({ error: "Invalid age." });
        }
        if (avatar && typeof avatar !== "number") {
            return res.status(400).json({ error: "Invalid avatar selection." });
        }

        // 🟡 Update allowed fields
        if (alias) user.alias = alias;
        if (age) user.age = age;
        if (avatar) user.avatar = avatar;

        // 🧭 If user is Guest and provides a new email → upgrade to Registered
        if (email && user.userType === "Guest") {
            user.email = email.toLowerCase().trim();
            user.userType = "Registered";
        }

        user.lastupdated_at = new Date();
        await user.save();

        // ✅ Clean response
        const { password: _, ...userWithoutPassword } = user.toObject();

        return res.status(200).json({
            message: user.userType === "Registered"
                ? "Email updated — account upgraded to Registered!"
                : "User details updated successfully!",
            user: userWithoutPassword
        });

    } catch (error) {
        console.error("❌ Error updating user details:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
