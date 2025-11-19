const express = require("express");
const mongoose = require("mongoose");
const WisdomPointsLedger = require("../models/WisdomPointsLedger");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/**
 * Helper function to calculate the start date for the leaderboard aggregation,
 * based on the requested period ('day', 'week', 'month', 'year').
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
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        default:
            return null; // Invalid period
    }
    return startDate;
};


router.get("/", authenticateToken, async (req, res) => {
    // period can be 'day', 'week', 'month', 'year'
    const period = req.query.period ? req.query.period.toLowerCase() : 'month'; 
    const startDate = getStartDate(period);

    if (!startDate) {
        return res.status(400).json({ message: "Invalid or missing 'period' query parameter. Must be 'day', 'week', 'month', or 'year'." });
    }

    try {
        // --- Aggregation Pipeline ---
        const pipeline = [
            // 1. Filter ledger entries by the start date of the period
            {
                $match: {
                    // Only include entries after the start date
                    timestamp: { $gte: startDate } 
                }
            },
            // 2. Group by userId and sum the points
            {
                $group: {
                    _id: "$userId",
                    totalPoints: { $sum: "$points" }
                }
            },
            // 3. Sort by total points (descending)
            {
                $sort: { totalPoints: -1 }
            },
            // 4. Limit to the top 100 players (adjust as needed)
            {
                $limit: 100 
            },
            // 5. Join with the users collection to get player details
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
                    avatar: { $ifNull: ["$userDetails.avatar", 1] }
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