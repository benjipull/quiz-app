require("dotenv").config();
const express = require("express");
const User = require("../models/user"); 
const authenticateToken = require("../middleware/auth"); // Ensure you have this middleware

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
    try {

        // Extract user ID from the token
        const userId = req.user.id;  
        const { alias, age, avatar } = req.body;  

        // ✅ Validate Inputs
        if (!alias || typeof alias !== "string") {
            return res.status(400).json({ error: "Invalid alias." });
        }
        if (!age || isNaN(age) || age < 1) {
            return res.status(400).json({ error: "Invalid age." });
        }
        if (!avatar || typeof avatar !== "string") {
            return res.status(400).json({ error: "Invalid avatar selection." });
        }

        // ✅ Update User in MongoDB
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { alias, age, avatar, lastupdated_at: Date.now() },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found." });
        }

        return res.status(200).json({ message: "User details updated successfully!", user: updatedUser });

    } catch (error) {
        console.error("❌ Error updating user details:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
