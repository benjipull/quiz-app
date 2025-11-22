const mongoose = require("mongoose");

const WisdomPointsLedgerSchema = new mongoose.Schema({
    // Reference to the User who earned the points
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true // Index for efficient lookups
    },
    // The amount of wisdom/knowledge points earned (KP/XP)
    points: {
        type: Number,
        required: true
    },
    // Timestamp for aggregation (Day, Week, Month, Year)
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Index for date range queries
    },
    // Optional: Source of the Knowledge Points (Coin sources removed)
    source: {
        type: String,
        // Only include sources that grant or deduct Knowledge Points (KP/XP)
        enum: ['quiz-completion', 'admin-grant'], 
        default: 'quiz-completion'
    }
});

module.exports = mongoose.model("WisdomPointsLedger", WisdomPointsLedgerSchema);