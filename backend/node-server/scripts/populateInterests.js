// populateInterests.js
require('dotenv').config({ path: '../.env' });
const mongoose = require("mongoose");
const Interest = require("../models/interest");
const connectDB = require("../config/db");

connectDB();

const interests = [
  { name: "Music" },
  { name: "Travel" },
  { name: "Reading" },
  { name: "Movies and TV shows" },
  { name: "Technology and gadgets" },
  { name: "Fitness and exercise" },
  { name: "Gaming" },
  { name: "Sports" },
  { name: "Nature and the outdoors" },
  { name: "Art and design" },
  { name: "Fashion and style" },
  { name: "Socializing with friends" },
  { name: "Volunteering or community service" },
  { name: "DIY and home improvement" },
  { name: "Gardening" },
  { name: "Meditation and mindfulness" },
  { name: "Science and innovation" },
  { name: "History and culture" },
  { name: "Writing or journaling" },
];

async function populate() {
  try {
    await Interest.deleteMany();
    await Interest.insertMany(interests);
    console.log("✅ Interests populated successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Error populating interests:", err);
    process.exit(1);
  }
}

populate();