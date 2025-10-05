require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("./models/categoryModel");
const connectDB = require("./config/db");

const { populateCategoryLoop } = require("./scripts/populateCategories"); // Import the function

async function populateAllCategories() {
    try {

        //console.log("🔍 MONGO_URI:", process.env.MONGO_URI);

        await connectDB();
        
        const categories = await Category.aggregate([
        {
            $project: {
            name: 1,
            questionCount: {
                $size: {
                $filter: {
                    input: "$questions",
                    as: "q",
                    cond: { $eq: ["$$q.disabled", false] } // only enabled
                }
                }
            }
            }
        },
        { $sort: { questionCount: 1 } }, // Sort by enabled question count (ascending)
        { $limit: 20 } // Get only the lowest
        ]);

        if (categories.length === 0) {
            console.error("❌ No categories found.");
            return;
        }

        console.log(`🔹 Populating the categories with the lowest quesiton count.`);

        for (const category of categories) {
            await populateCategoryLoop(category._id, 40, "very easy and simple");
        }

        console.log("🎉 All categories populated successfully!");
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Error populating categories:", error.message);
        mongoose.connection.close();
    }
}

// Execute the function
populateAllCategories();
