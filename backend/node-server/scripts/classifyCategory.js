require("dotenv").config();
const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");

installScriptErrorPrefix();

const Category = require("../models/categoryModel");
const {
  assertOllamaSetup,
  callOllama,
  getOllamaResponseText,
} = require("../services/ollamaClient");
const { parseJsonObjectOrThrow } = require("./jsonParsingHelper");
const {
  FIXED_CATEGORY_GROUPS,
  buildClassifyCategoryPrompt,
} = require("./prompts/classifyCategoryPrompt");

try {
  assertOllamaSetup();
} catch (error) {
  console.error(`❌ ERROR ${error.message}`);
  process.exit(1);
}

async function classifyCategory(name) {
  const prompt = buildClassifyCategoryPrompt(name, FIXED_CATEGORY_GROUPS);

  try {
    const response = await callOllama({
      prompt,
      presetName: "classifyCategory",
    });

    const output = getOllamaResponseText(response);
    const json = parseJsonObjectOrThrow(output, {
      normalizeOptions: {
        stripMarkdown: true,
        stripThinkTags: true,
        normalizeQuotes: true,
      },
    });

    json.groups = Array.isArray(json.groups)
      ? json.groups.filter((group) => FIXED_CATEGORY_GROUPS.includes(group))
      : [];
    json.tags = Array.isArray(json.tags) ? json.tags : [];

    return json;
  } catch (error) {
    console.error("❌ Error classifying category:", error.message);
    return { groups: [], tags: [] };
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const categoryName = process.argv[2] || "World Capitals";
  const classification = await classifyCategory(categoryName);
  console.log(`Classification for "${categoryName}":`, classification);

  let category = await Category.findOne({ name: categoryName });
  if (!category) {
    category = new Category({ name: categoryName, createdBy: null });
  }

  category.groups = classification.groups;
  category.tags = classification.tags;
  await category.save();
  console.log("Saved category:", category);

  await mongoose.disconnect();
}

run();
