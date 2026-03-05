require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { alias, age, avatar, email, password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (alias !== undefined && typeof alias !== "string") {
      return res.status(400).json({ error: "Invalid alias." });
    }
    if (age !== undefined && (isNaN(age) || Number(age) < 1)) {
      return res.status(400).json({ error: "Invalid age." });
    }
    if (
      avatar !== undefined &&
      (typeof avatar !== "number" || !Number.isInteger(avatar) || avatar < 1)
    ) {
      return res.status(400).json({ error: "Invalid avatar selection." });
    }

    const wasGuest = user.userType === "Guest";
    const normalizedAlias = typeof alias === "string" ? alias.trim() : undefined;

    if (normalizedAlias !== undefined) {
      if (!normalizedAlias) {
        return res.status(400).json({ error: "Alias cannot be empty." });
      }

      const aliasExists = await User.findOne({
        alias: normalizedAlias,
        _id: { $ne: userId },
      }).lean();

      if (aliasExists) {
        return res.status(409).json({ error: "Alias already exists." });
      }
    }

    if (typeof email === "string") {
      const normalizedEmail = email.toLowerCase().trim();
      const emailExists = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      }).lean();

      if (emailExists) {
        return res.status(409).json({ error: "Email already exists." });
      }
    }

    if (normalizedAlias !== undefined) user.alias = normalizedAlias;
    if (age !== undefined) user.age = Number(age);
    if (avatar !== undefined) user.avatar = avatar;

    if (email) {
      user.email = email.toLowerCase().trim();

      if (wasGuest) {
        if (!password || password.length < 6) {
          return res.status(400).json({
            error: "Password is required and must be at least 6 characters long when registering.",
          });
        }
        user.password = password;
        user.userType = "Registered";
        user.coins += 2000;
        console.log(`Granted 2000 coins to user ${user.alias} for upgrading from Guest to Registered.`);
      } else if (password) {
        user.password = password;
      }
    }

    user.lastupdated_at = new Date();
    await user.save();

    const { password: _, ...userWithoutPassword } = user.toObject();

    const token = jwt.sign(
      {
        id: user._id.toString(),
        alias: user.alias,
        userType: user.userType,
      },
      process.env.JWT_SECRET
    );

    const message =
      wasGuest && user.userType === "Registered"
        ? "Email updated - account upgraded to Registered!"
        : "User details updated successfully!";

    return res.status(200).json({
      message,
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField === "alias") {
        return res.status(409).json({ error: "Alias already exists." });
      }
      if (duplicateField === "email") {
        return res.status(409).json({ error: "Email already exists." });
      }
      return res.status(409).json({ error: "Duplicate value not allowed." });
    }

    if (error?.name === "ValidationError") {
      const firstMessage = Object.values(error.errors || {})[0]?.message;
      return res.status(400).json({ error: firstMessage || "Invalid user details." });
    }

    console.error("Error updating user details:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
