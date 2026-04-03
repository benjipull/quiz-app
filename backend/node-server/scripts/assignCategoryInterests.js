require("dotenv").config();
const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");

installScriptErrorPrefix();

const Category = require("../models/categoryModel");
const Interest = require("../models/interest");
const {
  assertOllamaSetup,
  callOllama,
  getOllamaResponseText,
} = require("../services/ollamaClient");
const { parseJsonObject } = require("./jsonParsingHelper");
const {
  buildAssignCategoryInterestsPrompt,
} = require("./prompts/assignCategoryInterestsPrompt");

try {
  assertOllamaSetup();
} catch (error) {
  console.error(`❌ ERROR ${error.message}`);
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const allInterests = await Interest.find({});
  const interestNames = allInterests.map((interest) => interest.name);
  console.log(`Loaded ${allInterests.length} interests`);

  const categories = await Category.find({});
  console.log(`Loaded ${categories.length} categories`);

  for (const category of categories) {
    console.log("------------------------------------------------------------");
    console.log(`Category: ${category.name}`);
    console.log("------------------------------------------------------------");

    const prompt = buildAssignCategoryInterestsPrompt({
      interestNames,
      categoryName: category.name,
      categoryDescription: category.description,
    });

    try {
      const response = await callOllama({
        prompt,
        presetName: "assignCategoryInterests",
      });

      const raw = getOllamaResponseText(response);
      const parsed = parseJsonObject(raw, {
        normalizeOptions: {
          stripMarkdown: true,
          stripThinkTags: true,
          normalizeQuotes: true,
        },
      });

      if (!parsed) {
        console.error("❌ Could not parse model JSON:");
        console.log(raw);
        continue;
      }

      if (!Array.isArray(parsed.interests)) {
        console.error("❌ Invalid response format:", parsed);
        continue;
      }

      const interestIds = parsed.interests
        .map((name) => {
          const found = allInterests.find(
            (interest) => interest.name.toLowerCase() === String(name).toLowerCase(),
          );
          return found ? found._id : null;
        })
        .filter((id) => id !== null);

      console.log("AI suggested interests:");
      parsed.interests.forEach((name) => console.log(`  - ${name}`));

      console.log("Mapped IDs:");
      interestIds.forEach((id) => console.log(`  - ${id}`));

      if (interestIds.length === 0) {
        console.error("❌ No valid interests mapped. Skipping update.");
        continue;
      }

      await Category.updateOne(
        { _id: category._id },
        { $set: { interests: interestIds } },
      );

      console.log("Saved to category.");
    } catch (error) {
      console.error(`❌ Error with category "${category.name}":`, error.message);
    }
  }

  console.log("Done assigning interests to all categories.");
  process.exit(0);
}

run();
