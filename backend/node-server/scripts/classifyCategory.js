require("dotenv").config();
const mongoose = require("mongoose");

const Category = require("../models/categoryModel");
const {
  assertOllamaSetup,
  callOllama,
  getOllamaResponseText,
} = require("../services/ollamaClient");

try {
  assertOllamaSetup();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

const FIXED_GROUPS = [
  "Geography", "History", "Science", "Movies", "Music",
  "Sports", "Art & Literature", "Technology", "Politics",
  "Nature & Environment", "Culture & Traditions", "Mythology",
  "Food & Drink", "Business & Economics", "Language & Linguistics",
  "Space & Astronomy", "Health & Medicine", "Philosophy",
  "General Knowledge", "Education & Learning"
];

// ===== Prompt builder =====
function buildPrompt(categoryName) {
  return `
You are a Quiz Category Classifier.
Assign the category "${categoryName}" to:

1. "groups": Pick 1–3 items from this fixed list only:
${FIXED_GROUPS.join(", ")}

2. "tags": Generate 3–6 short keywords that describe the category in more detail.
Tags should be lowercase, concise, and descriptive.

Return STRICT JSON with this format:
{
  "groups": ["..."],
  "tags": ["..."]
}
  `;
}

// ===== Call Ollama =====
async function classifyCategory(name) {
  const prompt = buildPrompt(name);

  try {
    const response = await callOllama({
      prompt,
      presetName: "classifyCategory",
    });

    const output = getOllamaResponseText(response);
    const json = JSON.parse(output.trim());

    // Safety: only allow groups from FIXED_GROUPS
    json.groups = json.groups.filter(g => FIXED_GROUPS.includes(g));

    return json;
  } catch (err) {
    console.error("❌ Error classifying category:", err.message);
    return { groups: [], tags: [] };
  }
}

// ===== Example usage =====
async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  // For demo: pretend a category exists
  const categoryName = process.argv[2] || "World Capitals";

  const classification = await classifyCategory(categoryName);

  console.log(`✅ Classification for "${categoryName}":`, classification);

  // Update or create category
  let category = await Category.findOne({ name: categoryName });
  if (!category) {
    category = new Category({ name: categoryName, createdBy: null });
  }
  category.groups = classification.groups;
  category.tags = classification.tags;

  await category.save();
  console.log("💾 Saved category:", category);

  await mongoose.disconnect();
}

run();
