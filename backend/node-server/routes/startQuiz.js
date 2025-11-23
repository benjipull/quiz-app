const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");
const { userQuestions } = require("../index"); // Import shared store

const QUIZ_COST = 100; // Define the quiz cost (100 coins)

const difficultyNames = {
    1: "Basic",
    2: "Easy",
    3: "Casual",
    4: "Moderate",
    5: "Challenging",
    6: "Hard",
    7: "Tough",
    8: "Expert",
    9: "Master",
    10: "Legendary"
};

router.post("/", authenticateToken, async (req, res) => {
    // ... (unchanged setup code)
    const noQuestions = 10;
    const { categoryId } = req.body;

    // ... (unchanged token and validation checks)

    const userId = req.user.id;

    console.log("✅ Extracted User ID:", userId);
    try {
        // --- 1. Basic Validation ---
        const category = await Category.findById(categoryId).lean();
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "❌ User not found" });
        }

        // --- 2. MODIFIED: Coin Balance Check (ALLOW NEGATIVE) ---
        // -----------------------------------------------------------------
        // OLD CODE (Removed):
        // if (user.coins < QUIZ_COST) {
        //     return res.status(403).json({ 
        //         message: `Insufficient coins...` 
        //     });
        // }
        // -----------------------------------------------------------------
        
        // This section is now skipped, allowing the code to proceed
        // regardless of the user's current coin balance (even if negative).
        
        const userLevel = user.level || 1;

        // Sliding difficulty window based on user level
        let minDifficulty = Math.max(1, userLevel - 1);
        let maxDifficulty = Math.min(10, userLevel + 1);

        console.log(`User level: ${userLevel}, selecting difficulties ${minDifficulty}-${maxDifficulty}`);

        // --- 3. Select Questions ---
        // ... (unchanged question selection logic)
        const filtered = category.questions.filter(q =>
            !q.disabled &&
            q.difficulty_level >= minDifficulty &&
            q.difficulty_level <= maxDifficulty
        );

        const selectedQuestions = filtered
            .sort((a, b) => {
                if (a.timesLoaded !== b.timesLoaded) {
                    // 🟢 First priority: lower timesLoaded ranks higher (less recently used)
                    return a.timesLoaded - b.timesLoaded;
                }
                // 🟡 Second priority: higher popularity ranks higher
                return b.popularity - a.popularity;
            })
            .slice(0, noQuestions);

        // --- 4. Question Sufficiency Check (Unchanged) ---
        if (selectedQuestions.length < noQuestions) {
            console.error(
                `Cannot start Quiz. Only ${selectedQuestions.length} questions found in difficulty window (needed ${noQuestions}).`
            );
            return res.status(404).json({
                message: `Not enough available questions in this difficulty range (${selectedQuestions.length} found, need ${noQuestions}).`
            });
        }

        // --- 5. Finalize Transaction & Start Quiz (Deduction still occurs) ---
        // 💰 QUIZ COST DEDUCTION: This line ensures the deduction happens,
        // even if it results in a negative balance.
        user.coins -= QUIZ_COST; 
        await user.save();
        
        console.log(`💸 Deducted ${QUIZ_COST} coins to start quiz for user ${userId}. New Balance: ${user.coins}`);
        
        // ... (unchanged logic for storing questions in userQuestions and returning response)

        res.json({
            message: "Questions preloaded and quiz cost deducted.",
            total: selectedQuestions.length,
            difficultyRange: [minDifficulty, maxDifficulty],
            userCoins: user.coins 
        });

    } catch (error) {

        console.error("❌ Error loading questions or processing quiz start:", error.message);
        res.status(500).json({ message: "❌ Server error during quiz setup.", error: error.message });
    }
});

module.exports = router;