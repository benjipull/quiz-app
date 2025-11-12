require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("./models/categoryModel");
const connectDB = require("./config/db");
const { populateDifficulty } = require("./scripts/populateDifficulty");

async function batchPopulateDifficulty() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    const categories = await Category.aggregate([
      { $unwind: "$questions" },
      {
        $match: {
          "questions.disabled": { $ne: true },
          $or: [
            { "questions.difficultyConfirmedVersion": { $exists: false } },
            { "questions.difficultyConfirmedVersion": 0 }
          ]
        }
      },
      {
        $project: {
          categoryId: "$_id",            // 🧠 include the parent category ID!
          questionId: "$questions._id",
          text: "$questions.text"
        }
      },
      { $limit: 1000 }
    ]);


    if (categories.length === 0) {
      console.log("✅ No enabled questions without difficulty found.");
      await mongoose.connection.close();
      return;
    }

    console.log(`🔹 Found ${categories.length} enabled questions to process.\n`);

    let success = 0;
    let fail = 0;

    for (let i = 0; i < categories.length; i++) {
      const q = categories[i];
      console.log(`(${i + 1}/${categories.length}) 🧠 ${q.text.substring(0, 80)}...`);
      const ok = await populateDifficulty(q.categoryId, q.questionId);

      if (ok) success++;
      else fail++;

      // small delay to avoid GPU spikes
      await new Promise(r => setTimeout(r, 500));
    }

    console.log("\n🎯 Finished processing difficulty levels!");
    console.log(`✅ Successful: ${success}`);
    console.log(`❌ Failed: ${fail}`);

    await mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error in batchPopulateDifficulty:", err);
    await mongoose.connection.close();
  }
}

batchPopulateDifficulty();
