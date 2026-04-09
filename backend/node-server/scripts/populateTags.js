require("dotenv").config();
const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");
const Tag = require("../models/tag");

installScriptErrorPrefix();

const tags = [
  "nature",
  "wildlife",
  "plants",
  "ocean",
  "weather",
  "geography",
  "space",
  "history",
  "ancient civilization",
  "mythology",
  "folklore",
  "literature",
  "art",
  "science",
  "technology",
  "inventions",
  "medicine",
  "biology",
  "astronomy",
  "language",
  "food",
  "sport",
  "music",
  "exploration",
  "survival",
  "mystery",
  "magic",
  "travel",
  "treasure",
  "danger",
  "discovery",
  "fantasy",
  "legend",
  "epic",
];

async function populateTags() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const normalizedTags = tags
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter(Boolean);

  const operations = normalizedTags.map((name) => ({
    updateOne: {
      filter: { name },
      update: { $setOnInsert: { name } },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await Tag.bulkWrite(operations, { ordered: false });
  }

  const total = await Tag.countDocuments();
  const insertedList = await Tag.find({ name: { $in: normalizedTags } })
    .sort({ name: 1 })
    .select("_id name")
    .lean();

  console.log(`Ensured ${normalizedTags.length} tags from seed list.`);
  console.log(`Tag collection now has ${total} documents.`);
  console.log("Seeded tags:");
  insertedList.forEach((tag) => {
    console.log(`- ${tag._id}: ${tag.name}`);
  });
}

populateTags()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Failed to populate tags:", error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
