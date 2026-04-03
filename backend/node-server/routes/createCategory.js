const express = require("express");
const Category = require("../models/categoryModel");
const { body, validationResult } = require("express-validator");
const authenticateToken = require("../middleware/auth");
const { populateCategory } = require("../scripts/populateCategories");

const router = express.Router();

router.post(
  "/createCategory",
  authenticateToken,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Category name is required")
      .isLength({ min: 3 })
      .withMessage("Category name must be at least 3 characters long"),
  ],
  async (req, res) => {
    const authHeader = req.headers.authorization;
    const userToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!userToken) {
      return res.status(401).json({ message: "Missing or invalid Authorization header." });
    }

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;
      const userId = req.user?.id;
      const userType = req.user?.userType;

      console.log("User ID:", userId, "| Type:", userType);

      if (!userId) {
        return res.status(401).json({ message: "User ID not found in token." });
      }

      const allowedTypes = ["registered", "admin"];
      if (!userType || !allowedTypes.includes(userType.toLowerCase())) {
        return res.status(403).json({
          message: `You are not allowed to create categories. (Type: ${userType || "undefined"})`,
        });
      }

      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (existingCategory) {
        return res.status(400).json({ message: "Category already exists." });
      }

      const category = new Category({
        name,
        createdBy: userId,
        disabled: true,
      });

      await category.save();
      console.log(`Populating category: ${category._id} (${name})`);

      (async function runPopulateCategory(categoryId, times) {
        for (let i = 0; i < times; i += 1) {
          console.log(`Running populateCategory attempt ${i + 1} for ${name}...`);
          await populateCategory(categoryId, 1);
        }

        await Category.findByIdAndUpdate(categoryId, { disabled: false });
        console.log(`Category ${name} populated and enabled.`);
      })(category._id, 40).catch((err) =>
        console.error("Error populating category:", err),
      );

      return res.status(201).json({ message: "Category created and populating...", category });
    } catch (error) {
      console.error("Server error:", error.message);
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

module.exports = router;
