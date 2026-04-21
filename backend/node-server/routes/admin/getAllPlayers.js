const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const Category = require("../../models/categoryModel");
const SagaLevelProgression = require("../../models/SagaLevelProgression");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");
const { getLevelForKnowledgePoints } = require("../../config/levelConfig");

// GET /api/admin/players
router.get("/", auth, adminAuth, async (req, res) => {
  try {
    const players = await User.find(
      {},
      "alias userType level knowledgePoints quizzesCompleted coins lastlogin_at created_at"
    ).sort({ lastlogin_at: -1, alias: 1 });

    const completionCounts = await Category.aggregate([
      { $unwind: "$completions" },
      {
        $group: {
          _id: "$completions.user",
          count: { $sum: 1 },
        },
      },
    ]);

    const completionCountMap = new Map(
      completionCounts.map((entry) => [String(entry._id), Number(entry.count || 0)])
    );

    const backfillUpdates = [];
    const playersWithBackfilledCounts = players.map((player) => {
      const playerId = String(player._id);
      const storedCount = Number(player.quizzesCompleted || 0);
      const historicalCount = completionCountMap.get(playerId) || 0;
      const resolvedCount = Math.max(storedCount, historicalCount);

      if (resolvedCount !== storedCount) {
        backfillUpdates.push({
          updateOne: {
            filter: { _id: player._id },
            update: { $set: { quizzesCompleted: resolvedCount } },
          },
        });
      }

      const playerObject = player.toObject();
      playerObject.quizzesCompleted = resolvedCount;
      return playerObject;
    });

    if (backfillUpdates.length > 0) {
      await User.bulkWrite(backfillUpdates);
    }

    res.status(200).json(playersWithBackfilledCounts);
  } catch (error) {
    console.error("Error fetching admin players list:", error.message);
    res
      .status(500)
      .json({ error: "Server error. Failed to fetch players." });
  }
});

// PATCH /api/admin/players/:playerId/reset-progress
router.patch("/:playerId/reset-progress", auth, adminAuth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const updatedPlayer = await User.findByIdAndUpdate(
      playerId,
      {
        $set: {
          knowledgePoints: 0,
          level: getLevelForKnowledgePoints(0),
          lastupdated_at: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
        select: "alias userType level knowledgePoints",
      }
    );

    if (!updatedPlayer) {
      return res.status(404).json({ error: "Player not found." });
    }

    await SagaLevelProgression.deleteMany({ player: updatedPlayer._id });

    return res.status(200).json({
      message: "Player progress reset successfully.",
      player: updatedPlayer,
    });
  } catch (error) {
    const isCastError = error?.name === "CastError";
    if (isCastError) {
      return res.status(400).json({ error: "Invalid player id." });
    }

    console.error("Error resetting player progress:", error.message);
    return res
      .status(500)
      .json({ error: "Server error. Failed to reset player progress." });
  }
});

module.exports = router;
