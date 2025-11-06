require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");
const bcrypt = require("bcryptjs");

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { alias, age, avatar, email, password } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Basic validation
    if (alias && typeof alias !== "string") {
      return res.status(400).json({ error: "Invalid alias." });
    }
    if (age && (isNaN(age) || age < 1)) {
      return res.status(400).json({ error: "Invalid age." });
    }
    if (avatar && typeof avatar !== "number") {
      return res.status(400).json({ error: "Invalid avatar selection." });
    }

    // Track userType before update
    const wasGuest = user.userType === "Guest";

    // Update allowed fields
    if (alias) user.alias = alias;
    if (age) user.age = age;
    if (avatar) user.avatar = avatar;

    if (email) {
      user.email = email.toLowerCase().trim();

      // upgrading from Guest to Registered
      if (wasGuest) {
        if (!password || password.length < 6) {
          return res.status(400).json({
            error: "Password is required and must be at least 6 characters long when registering.",
          });
        }
        user.password = password;
        user.userType = "Registered";
      }
      // allow registered users to change password too
      else if (password) {
        user.password = password;
      }
    }


    user.lastupdated_at = new Date();
    await user.save();

    // Exclude password field from response
    const { password: _, ...userWithoutPassword } = user.toObject();

    // Generate a new JWT token reflecting updated info
    const token = jwt.sign(
      {
        id: user._id.toString(),
        alias: user.alias,
        userType: user.userType,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Choose message
    const message =
      wasGuest && user.userType === "Registered"
        ? "Email updated — account upgraded to Registered!"
        : "User details updated successfully!";

    // Return updated user + new token
    return res.status(200).json({
      message,
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("❌ Error updating user details:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
