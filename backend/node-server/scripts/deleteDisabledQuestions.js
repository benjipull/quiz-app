require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");

async function deleteDisabledQuestions() {
  try {
    await connectDB();
    console.log("🔗 Connected to MongoDB\n");

    // First, get a count of disabled questions
    const categoriesWithDisabled = await Category.aggregate([
      {
        $project: {
          name: 1,
          disabledCount: {
            $size: {
              $filter: {
                input: "$questions",
                as: "q",
                cond: { $eq: ["$$q.disabled", true] }
              }
            }
          },
          totalCount: { $size: "$questions" }
        }
      },
      {
        $match: {
          disabledCount: { $gt: 0 }
        }
      }
    ]);

    const totalDisabled = categoriesWithDisabled.reduce((sum, cat) => sum + cat.disabledCount, 0);
    const totalQuestions = categoriesWithDisabled.reduce((sum, cat) => sum + cat.totalCount, 0);

    console.log("📊 CURRENT STATE");
    console.log("=".repeat(80));
    console.log(`Total questions across all categories: ${totalQuestions}`);
    console.log(`Total disabled questions to delete: ${totalDisabled}`);
    console.log(`Categories affected: ${categoriesWithDisabled.length}\n`);

    if (totalDisabled === 0) {
      console.log("✅ No disabled questions found. Nothing to delete.\n");
      await mongoose.connection.close();
      return;
    }

    console.log("Categories with disabled questions:");
    categoriesWithDisabled.forEach(cat => {
      console.log(`  • ${cat.name}: ${cat.disabledCount} disabled out of ${cat.totalCount} total`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("🗑️  DELETING DISABLED QUESTIONS...");
    console.log("=".repeat(80) + "\n");

    // Delete disabled questions from all categories
    const result = await Category.updateMany(
      {},
      {
        $pull: {
          questions: { disabled: true }
        }
      }
    );

    console.log(`✅ Successfully processed ${result.modifiedCount} categories\n`);

    // Verify deletion
    const afterDeletion = await Category.aggregate([
      {
        $project: {
          name: 1,
          disabledCount: {
            $size: {
              $filter: {
                input: "$questions",
                as: "q",
                cond: { $eq: ["$$q.disabled", true] }
              }
            }
          },
          totalCount: { $size: "$questions" }
        }
      }
    ]);

    const remainingDisabled = afterDeletion.reduce((sum, cat) => sum + cat.disabledCount, 0);
    const remainingTotal = afterDeletion.reduce((sum, cat) => sum + cat.totalCount, 0);

    console.log("=".repeat(80));
    console.log("📊 AFTER DELETION");
    console.log("=".repeat(80));
    console.log(`Total questions remaining: ${remainingTotal}`);
    console.log(`Disabled questions remaining: ${remainingDisabled}`);
    console.log(`Questions deleted: ${totalDisabled - remainingDisabled}\n`);

    if (remainingDisabled === 0) {
      console.log("✅ All disabled questions successfully deleted!\n");
    } else {
      console.log("⚠️  Some disabled questions may still remain. Check the database.\n");
    }

    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed.");

  } catch (error) {
    console.error("❌ Error deleting disabled questions:", error);
    await mongoose.connection.close();
  }
}

deleteDisabledQuestions();
