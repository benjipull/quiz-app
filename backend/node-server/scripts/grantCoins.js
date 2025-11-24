// grantCoins.js
require('dotenv').config({ path: '../.env' }); // load env
const mongoose = require("mongoose");
const User = require("../models/user");
const connectDB = require("../config/db"); // make sure you have a connectDB function

const BONUS_AMOUNT = 5000;

connectDB(); // connect to MongoDB

async function grantCoins() {
  try {
    // Increment coins for all users
    const result = await User.updateMany(
      {}, // all users
      { $inc: { coins: BONUS_AMOUNT } }
    );

    console.log(`✅ Granted ${BONUS_AMOUNT} coins to ${result.modifiedCount} users!`);
    process.exit(); // exit script
  } catch (err) {
    console.error("❌ Error granting coins:", err);
    process.exit(1);
  }
}

grantCoins();
