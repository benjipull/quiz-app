const express = require("express");
const User = require("../models/user"); 
const authenticateToken = require("../middleware/auth");

const router = express.Router();
const DAILY_BONUS_COINS = 500; // 500 coins to claim
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

router.post("/", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        
        const now = new Date();
        const lastClaimTime = user.lastDailyCoinClaim;
        
        // Check if 24 hours have passed since the last claim
        if (lastClaimTime && (now.getTime() - lastClaimTime.getTime() < DAILY_COOLDOWN_MS)) {
            const timeRemainingMs = DAILY_COOLDOWN_MS - (now.getTime() - lastClaimTime.getTime());
            
            // Return the time remaining for the frontend countdown
            return res.status(403).json({ 
                message: "Daily coin bonus already claimed. Please wait.",
                timeRemainingMs: timeRemainingMs // Key for frontend countdown
            });
        }
        
        // Grant the daily coin bonus
        user.coins += DAILY_BONUS_COINS;
        user.lastDailyCoinClaim = now; // Update the last claim timestamp
        await user.save();

        // ❌ Ledger entry logic for coins removed (as seen in the provided snippet)

        res.status(200).json({
            message: `🎉 Successfully claimed ${DAILY_BONUS_COINS} coins!`,
            coinsEarned: DAILY_BONUS_COINS,
            totalCoins: user.coins
        });

    } catch (error) {
        console.error("❌ Daily coin claim error:", error);
        res.status(500).json({ message: "⚠️ Server error.", error: error.message });
    }
});

module.exports = router;