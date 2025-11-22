const express = require("express");
const mongoose = require("mongoose");
const WisdomPointsLedger = require("../models/WisdomPointsLedger");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/**
 * Helper function to calculate the start date for the leaderboard aggregation,
 * based on the requested period ('day', 'week', 'month', 'year', 'all-time').
 */
const getStartDate = (period) => {
    const now = new Date();
    let startDate = new Date(now);

    // Set time to the very start of the day for accurate comparison
    startDate.setHours(0, 0, 0, 0); 

    switch (period) {
        case 'day':
            // startDate is already set to the start of today
            break;
        case 'week':
            // Using Monday (1) as the start of the week
            const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
            // Calculate days to subtract to get to Monday (or the day before if today is Sunday)
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
            startDate.setDate(now.getDate() - diff);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            // Set to the 1st day of the current month
            startDate.setDate(1); 
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'year':
            // Set to January 1st of the current year
            startDate.setMonth(0); // January
            startDate.setDate(1);  // 1st
            startDate.setHours(0, 0, 0, 0);
            break;
        default:
            // For 'all-time' or an unrecognized period
            startDate = new Date(0); // Epoch time
            break;
    }

    return startDate;
};

// @route   GET /api/leaderboard/:period
// @desc    Gets the leaderboard for a specific period
// @access  Registered
router.get("/:period", authenticateToken, async (req, res) => {
    // Ensure the period is lowercased for case-insensitive matching
    const period = req.params.period.toLowerCase();

    try {
        const startDate = getStartDate(period);

        const pipeline = [
            // 1. Filter entries to only include those after the start date
            {
                $match: {
                    timestamp: { $gte: startDate },
                }
            },
            // 2. Group by userId and sum the Knowledge Points
            {
                $group: {
                    _id: "$userId",
                    totalPoints: { $sum: "$points" } // Summing only Knowledge Points
                }
            },
            // 3. Sort by totalPoints (Knowledge Points) in descending order
            {
                $sort: {
                    totalPoints: -1
                }
            },
            // 4. Limit to the top 100 players
            {
                $limit: 100 
            },
            // 5. Join with the users collection to get player details (alias, level, avatar)
            {
                $lookup: {
                    from: "users", 
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            // 6. Deconstruct the userDetails array
            {
                $unwind: {
                    path: "$userDetails",
                    preserveNullAndEmptyArrays: false 
                }
            },
            // 7. Project the final required structure
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    totalPoints: 1, 
                    username: "$userDetails.alias", 
                    level: "$userDetails.level",
                    avatar: "$userDetails.avatar" 
                }
            }
        ];

        const leaderboard = await WisdomPointsLedger.aggregate(pipeline);

        res.status(200).json({
            period,
            startDate,
            leaderboard
        });

    } catch (error) {
        console.error("❌ Leaderboard aggregation error:", error);
        res.status(500).json({ message: "⚠️ Server error generating leaderboard.", error: error.message });
    }
});

module.exports = router;