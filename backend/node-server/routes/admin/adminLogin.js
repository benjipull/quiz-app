const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/user");

const router = express.Router();

// POST /api/admin/login
router.post("/", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if ((user.userType || "").toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        alias: user.alias,
        userType: user.userType,
      },
      process.env.JWT_SECRET
    );

    user.lastlogin_at = new Date();
    await user.save();

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      message: "Admin login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
