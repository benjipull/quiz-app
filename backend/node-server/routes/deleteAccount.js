const express = require("express");
const mongoose = require("mongoose");
const authenticateToken = require("../middleware/auth");
const User = require("../models/user");
const Category = require("../models/categoryModel");
const Report = require("../models/reportModel");
const WisdomPointsLedger = require("../models/WisdomPointsLedger");

const router = express.Router();

// @route   DELETE /api/users/me
// @desc    Delete currently authenticated user account and related user-linked data
// @access  Private
router.delete("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    const user = await User.findById(userId).select("userType");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Keep admin deletion out of this self-serve route.
    if (user.userType === "Admin") {
      return res.status(403).json({ error: "Admin accounts cannot be deleted from this route." });
    }

    const [categoriesDeletedResult, completionsCleanupResult, reportsDeletedResult, ledgerDeletedResult] =
      await Promise.all([
        Category.deleteMany({ createdBy: userId }),
        Category.updateMany(
          { "completions.user": userId },
          { $pull: { completions: { user: userId } } }
        ),
        Report.deleteMany({ userId }),
        WisdomPointsLedger.deleteMany({ userId }),
      ]);

    await User.deleteOne({ _id: userId });

    return res.status(200).json({
      message: "Account deleted successfully.",
      cleanup: {
        categoriesDeleted: categoriesDeletedResult.deletedCount || 0,
        categoriesUpdated: completionsCleanupResult.modifiedCount || 0,
        reportsDeleted: reportsDeletedResult.deletedCount || 0,
        ledgerEntriesDeleted: ledgerDeletedResult.deletedCount || 0,
      },
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
