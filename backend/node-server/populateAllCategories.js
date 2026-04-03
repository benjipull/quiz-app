require("dotenv").config();
const { installScriptErrorPrefix } = require("./scripts/errorLogger");
installScriptErrorPrefix();
const mongoose = require("mongoose");
const Category = require("./models/categoryModel");
const connectDB = require("./config/db");
const { populateCategoryLoop } = require("./scripts/populateCategories");

// --- Config ---
const BATCH_SIZE = 10;          // how many categories to process each iteration
const QUESTIONS_TO_FILL = 10;   // how many questions to add per category
const THRESHOLD = 60;           // only categories with <100 enabled questions

/**
 * Get categories with the lowest enabled-question count
 */
async function getLowestQuestionCategories(limit = BATCH_SIZE, threshold = THRESHOLD) {
  return Category.aggregate([
    {
      $project: {
        name: 1,
        questionCount: {
          $size: {
            $filter: {
              input: "$questions",
              as: "q",
              cond: { $eq: ["$$q.disabled", false] }, // count only enabled questions
            },
          },
        },
      },
    },
    { $match: { questionCount: { $lt: threshold } } }, // only low/empty categories
    { $sort: { questionCount: 1 } },                   // lowest first
    { $limit: limit },
  ]);
}

/**
 * Main population process
 */
async function populateAllCategories() {
  try {
    await connectDB();
    console.log("🚀 Connected to MongoDB");
    console.log("🔹 Starting category population loop...");

    let totalNewQuestions = 0;
    let iteration = 0;

    while (true) {
      iteration++;
      console.log(`\n🔁 Iteration ${iteration}: checking for low-question categories...`);

      const categories = await getLowestQuestionCategories();

      if (categories.length === 0) {
        console.log("✅ No categories need population — exiting.");
        break;
      }

      let newQuestionsAdded = 0;

      for (const category of categories) {
        console.log(
          `📘 Populating "${category.name}" (${category.questionCount} enabled questions)...`
        );

        // Call your AI population logic
        const added = await populateCategoryLoop(category._id, QUESTIONS_TO_FILL, "extremely easy and basic");

        if (added > 0) {
          newQuestionsAdded += added;
          totalNewQuestions += added;
          console.log(`   ➕ Added ${added} questions`);
        } else {
          console.log(`   ⚠️ No new questions added for ${category.name}`);
        }
      }

      if (newQuestionsAdded === 0) {
        console.log("✅ No new questions added — all categories appear filled.");
        break;
      }

    }

    console.log(`🎉 Finished populating. Total new questions added: ${totalNewQuestions}`);
  } catch (err) {
    console.error("❌ Error populating categories:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed.");
  }
}

// Run the script
populateAllCategories();
