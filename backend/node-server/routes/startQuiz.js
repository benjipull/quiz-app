const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const { userQuestions } = require("../index"); // ✅ Import shared store
const { populateCategory } = require("../scripts/populateCategories"); // ✅ Import async question population

// ✅ Route: Load Questions from Database Without Updating `timesLoaded`
router.post("/", async (req, res) => {
    const { categoryId, numQuestions, userToken } = req.body;

    if (!categoryId || !numQuestions || !userToken) {
        return res.status(400).json({ message: "❌ Missing required fields: categoryId, numQuestions, userToken." });
    }

    try {
        // ✅ Fetch category and select the 10 questions with the lowest `timesLoaded`
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ message: "❌ Category not found." });
        }

        // ✅ Get the least-loaded questions (sorted by `timesLoaded`, but NOT updating it yet)
        const selectedQuestions = category.questions
            .sort((a, b) => a.timesLoaded - b.timesLoaded) // Sort by lowest `timesLoaded`
            .slice(0, numQuestions); // Get the top `numQuestions`

        if (selectedQuestions.length === 0) {

            // ✅ Run `populateCategory` asynchronously
            console.error(`Cannot start Quiz, mo questions found. Populating category: ${category._id} (${category.name})`);
            populateCategory(category._id, 20);

            return res.status(404).json({ message: "❌ No available questions in this category please try again in a few minutes." });
        }

        // ✅ Run `populateCategory` asynchronously
        console.log(`⏳ Populating category: ${category._id} (${category.name})`);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);
        populateCategory(category._id, 1);

        // ✅ Store questions for user in memory for `nextQuestion.js`
        userQuestions[userToken] = selectedQuestions.map(q => ({
            _id: q._id,
            question: q.text,
            answers: q.answers.map(a => a.text),
            correct_answer: q.correct_answer,
            explanation: q.explanation
        }));

        console.log(`✅ Loaded ${selectedQuestions.length} questions for user ${userToken}`);

        res.json({ message: "✅ Questions preloaded!", total: selectedQuestions.length });

    } catch (error) {
        console.error("❌ Error loading questions from database:", error.message);
        res.status(500).json({ message: "❌ Server error.", error: error.message });
    }
});

module.exports = router;
