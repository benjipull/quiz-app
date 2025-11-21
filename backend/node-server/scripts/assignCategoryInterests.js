require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");

const Category = require("../models/categoryModel");
const Interest = require("../models/interest");

const OLLAMA_URL = process.env.OLLAMA_URL;

if (!OLLAMA_URL) {
  console.error("❌ Missing OLLAMA_URL in .env");
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("📦 Connected to MongoDB");

  // 1️⃣ Load all interests
  const allInterests = await Interest.find({});
  const interestNames = allInterests.map(i => i.name);

  console.log(`📘 Loaded ${allInterests.length} interests`);
  
  // 2️⃣ Load all categories
  const categories = await Category.find({});
  console.log(`📗 Loaded ${categories.length} categories\n`);

  for (const category of categories) {
    console.log("------------------------------------------------------------");
    console.log(`📂 Category: ${category.name}`);
    console.log("------------------------------------------------------------");

    const prompt = `
You are an AI assistant that assigns user interests to quiz categories.

Here is the list of ALL interests available:

${interestNames.join(", ")}

Given this category, choose the MOST RELEVANT 1–3 interests.

Category Name: ${category.name}
Description: ${category.description || "No description"}

Respond ONLY in strict JSON:
{
  "interests": ["Interest1", "Interest2"]
}
    `.trim();

    try {
      // 3️⃣ Query Llama
      const response = await axios.post(
        OLLAMA_URL,
        {
          model: "llama3",
          prompt,
          stream: false,
          options: {
            temperature: 0.2,
            top_p: 0.9,
            num_predict: 120
          }
        },
        { timeout: 180_000 }
      );

      const raw = String(response.data.response || "").trim();
      let parsed;

      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.error("❌ Could not parse model JSON:");
        console.log(raw);
        continue;
      }

      if (!parsed.interests || !Array.isArray(parsed.interests)) {
        console.error("❌ Invalid response format:", parsed);
        continue;
      }

      // 4️⃣ Convert interest names → IDs
      const interestIds = parsed.interests
        .map(name => {
          const found = allInterests.find(
            i => i.name.toLowerCase() === name.toLowerCase()
          );
          return found ? found._id : null;
        })
        .filter(id => id !== null);

      // 🧾 Pretty Print to console
      console.log("🧠 AI Suggested Interests:");
      parsed.interests.forEach(i => console.log(`   - ${i}`));

      console.log("\n🔗 Mapped to IDs:");
      interestIds.forEach(id => console.log(`   - ${id}`));

      if (interestIds.length === 0) {
        console.error("\n⚠️ No valid interests mapped. Skipping update.");
        continue;
      }

      // 5️⃣ Update category
      await Category.updateOne(
        { _id: category._id },
        { $set: { interests: interestIds } }
      );

      console.log("\n✅ Saved to category.");
      console.log("------------------------------------------------------------\n");

    } catch (err) {
      console.error(`❌ Error with category "${category.name}":`, err.message);
    }
  }

  console.log("\n🎉 Done assigning interests to all categories!");
  process.exit(0);
}

run();
