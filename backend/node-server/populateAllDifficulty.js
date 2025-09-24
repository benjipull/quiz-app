require("dotenv").config();
const mongoose = require("mongoose");
const { spawn } = require("child_process");
const Category = require("./models/categoryModel");
const connectDB = require("./config/db");

async function batchPopulateDifficulty() {
  try {
    await connectDB();

    // Find up to 100 questions missing difficulty
    const categories = await Category.aggregate([
      { $unwind: "$questions" },
      {
        $match: {
          $or: [
            { "questions.difficultyConfirmedVersion": 0 },
            { "questions.difficultyConfirmedVersion": { $exists: false } }
          ]
        }
      },
      {
        $project: {
          questionId: "$questions._id",
          text: "$questions.text",
          categoryId: "$_id"
        }
      },
      { $limit: 100 }
    ]);

    if (categories.length === 0) {
      console.log("✅ No questions without difficulty found.");
      mongoose.connection.close();
      return;
    }

    console.log(`🔹 Found ${categories.length} questions to process`);

    for (const q of categories) {
      console.log(`⚡ Processing question: ${q.text.substring(0, 80)}...`);

      // Spawn a new Node process to call your populateDifficulty script
      await new Promise((resolve, reject) => {
        const child = spawn("node", ["./scripts/populateDifficulty.js", q.questionId.toString()], {
          stdio: "inherit"
        });

        child.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`populateDifficulty failed for ${q.questionId} with exit code ${code}`));
          }
        });
      });
    }

    console.log("🎉 Finished populating difficulty for all selected questions!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error in batchPopulateDifficulty:", err);
    mongoose.connection.close();
  }
}

batchPopulateDifficulty();
