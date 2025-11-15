const express = require("express");
const mongoose = require("mongoose");
const WisdomPointsLedger = require("../models/WisdomPointsLedger");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Helper function to calculate the start date for aggregation
const getStartDate = (period) => {
    const now = new Date();
    let startDate = new Date(now);

    // Set time to the very start of the day for accurate comparison
    startDate.setHours(0, 0, 0, 0); 

    switch (period) {
        case 'day':
            break;
        case 'week':
            // Using Monday (1) as the start of the week
            const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to subtract to get Monday
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
            return null;
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
        const pipeline = [
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
            // 4. Limit to the top 50 players (adjust as needed)
            {
                $limit: 50 
            },
            // 5. Join with the users collection to get player details
            {
                $lookup: {
                    from: "users", // Assumes your User model/collection name is 'users'
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            // 6. Deconstruct the userDetails array
            {
                $unwind: {
                    path: "$userDetails",
                    preserveNullAndEmptyArrays: false // Only include users found
                }
            },
            // 7. Project the final required structure
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    totalPoints: 1,
                    username: "$userDetails.alias", // Use the alias field for the display name
                    level: "$userDetails.level"
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