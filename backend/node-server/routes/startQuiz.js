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
    // Note: The original code uses 'numQuestions' from req.body but then overrides it with 'noQuestions = 10'.
    // We will stick to the hardcoded 'noQuestions = 10' for simplicity and consistency with the original logic.
    const noQuestions = 10;
    const { categoryId } = req.body;

    const authHeader = req.headers["authorization"];
    const userToken = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!userToken) {
        return res.status(401).json({ message: "Missing or invalid Authorization header." });
    }

    if (!categoryId || !noQuestions) {
        return res.status(400).json({ message: "Missing required fields: categoryId, number of questions." });
    }

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

        // --- 2. Check Coin Balance ---
        if (user.coins < QUIZ_COST) {
            return res.status(403).json({ 
                message: `Insufficient coins. Requires ${QUIZ_COST} coins, but user has ${user.coins}.` 
            });
        }
        
        const userLevel = user.level || 1;

        // Sliding difficulty window based on user level
        let minDifficulty = Math.max(1, userLevel - 1);
        let maxDifficulty = Math.min(10, userLevel + 1);

        console.log(`User level: ${userLevel}, selecting difficulties ${minDifficulty}-${maxDifficulty}`);

        // --- 3. Select Questions ---
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

        // --- 4. Question Sufficiency Check ---
        if (selectedQuestions.length < noQuestions) {
            console.error(
                `Cannot start Quiz. Only ${selectedQuestions.length} questions found in difficulty window (needed ${noQuestions}).`
            );
            
            // NO COIN REFUND NEEDED: The deduction hasn't happened yet!

            return res.status(404).json({
                message: `Not enough available questions in this difficulty range (${selectedQuestions.length} found, need ${noQuestions}).`
            });
        }

        // --- 5. Finalize Transaction & Start Quiz (Deduction occurs here) ---
        // 💰 QUIZ COST DEDUCTION (Happens ONLY if all steps above succeeded)
        user.coins -= QUIZ_COST;
        await user.save();
        
        console.log(`💸 Deducted ${QUIZ_COST} coins to start quiz for user ${userId}. New Balance: ${user.coins}`);
        
        // Store questions for user in memory
        userQuestions[userToken] = {
            queue: selectedQuestions.map(q => ({
                _id: q._id,
                question: q.text,
                answers: q.answers.map(a => a.text),
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                timesAnsweredCorrectly: q.timesAnsweredCorrectly,
                timesAnsweredIncorrectly: q.timesAnsweredIncorrectly,
                difficultyLevel: q.difficulty_level,
                difficultyName: difficultyNames[q.difficulty_level] || "Unknown"
            })),
            current: null
        };

        console.log(`Loaded ${selectedQuestions.length} questions for user ${userToken}`);

        res.json({
            message: "Questions preloaded and quiz cost deducted.",
            total: selectedQuestions.length,
            difficultyRange: [minDifficulty, maxDifficulty],
            userCoins: user.coins // Return the new coin balance
        });

    } catch (error) {

        console.error("❌ Error loading questions or processing quiz start:", error.message);
        res.status(500).json({ message: "❌ Server error during quiz setup.", error: error.message });
    }
});

module.exports = router;