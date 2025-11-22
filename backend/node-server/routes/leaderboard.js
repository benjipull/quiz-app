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

    startDate.setHours(0, 0, 0, 0); 

    switch (period) {
        case 'day':
            break;
        case 'week':
            const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
            startDate.setDate(now.getDate() - diff);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate.setDate(1); 
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'year':
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        default:
            return null;
    }
    return startDate;
};


router.get("/", authenticateToken, async (req, res) => {
    const period = req.query.period ? req.query.period.toLowerCase() : 'month'; 
    const startDate = getStartDate(period);

    if (!startDate) {
        return res.status(400).json({ message: "Invalid or missing 'period' query parameter." });
    }

    try {
        // --- Aggregation Pipeline ---
        const pipeline = [
            // 1. Filter ledger entries by the start date of the period
            {
                $match: {
                    timestamp: { $gte: startDate } 
                }
            },
            // 2. 🔑 CRITICAL FIX: Filter out Coin entries ('daily-bonus')
            {
                $match: {
                    source: { $ne: 'daily-bonus' } // Exclude any entry whose source is for coins
                }
            },
            // 3. Group by userId and sum the Knowledge Points (XP)
            {
                $group: {
                    _id: "$userId",
                    totalPoints: { $sum: "$points" }
                }
            },
            // 4. Sort and Limit
            {
                $sort: { totalPoints: -1 }
            },
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
            // 6. Deconstruct the userDetails array (Keeping the fix from the previous step)
            {
                $unwind: {
                    path: "$userDetails",
                    preserveNullAndEmptyArrays: true // Use 'true' to ensure a user still shows if their data lookup fails (e.g., if their entry was deleted)
                }
            },
            // 7. Project the final required structure
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    totalPoints: 1,
                    // Use $ifNull to safely handle cases where $lookup failed (userDetails is null)
                    username: { $ifNull: ["$userDetails.alias", "Unknown User"] },
                    level: { $ifNull: ["$userDetails.level", 0] },
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