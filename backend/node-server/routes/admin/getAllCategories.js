const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

// GET /api/admin/categories
router.get("/", auth, adminAuth, async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $project: {
          name: 1,
          disabled: 1,
          averageRating: 1,
          createdAt: 1,
          createdBy: 1,
          // 🧮 count only non-disabled questions
          questionCount: {
            $size: {
              $filter: {
                input: "$questions",
                as: "q",
                cond: { $eq: ["$$q.disabled", false] }
              }
            }
          },
          completionCount: { $size: "$completions" }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);


    // populate user aliases for createdBy
    await Category.populate(categories, { path: "createdBy", select: "alias email" });

    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Server error fetching categories" });
  }
});

module.exports = router;
