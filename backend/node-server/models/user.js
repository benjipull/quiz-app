const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { getLevelForKnowledgePoints } = require("../config/levelConfig");

const UserSchema = new mongoose.Schema({
  alias: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  avatar: { type: Number, required: true, default: 1 },
  password: { type: String, required: true },
  age: { type: Number, required: true, min: 1 },

  // 🧠 Player stats
  knowledgePoints: { type: Number, required: true, default: 0 },
  quizzesCompleted: { type: Number, required: true, default: 0 },
  wisdomGems: { type: Number, required: true, default: 0 },
  enlightenmentCrystals: { type: Number, required: true, default: 0 },
  // Default coins for a new player is 1000
  coins: { type: Number, required: true, default: 1000 },
  level: { type: Number, required: true, default: () => getLevelForKnowledgePoints(0) },

  // 🏷️ New: Player interests
  interests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interest",
      default: [],
    },
  ],

  // 🕒 Timestamps
  created_at: { type: Date, default: Date.now },
  lastupdated_at: { type: Date, default: Date.now, required: true },
  lastlogin_at: { type: Date },

  // 💰 Coin Tracking
  lastDailyCoinClaim: { type: Date, default: null }, // Track last claim time
  // 💰 NEW: One-time login bonus flag
  initialLoginBonusClaimed: { type: Boolean, required: true, default: false }, // <-- ADDED

  // 👥 User type
  userType: {
    type: String,
    enum: ["Guest", "Registered", "Admin"],
    required: true,
    default: "Registered",
  },

  // 🔑 Password reset
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
});

// 🔐 Hash password before saving
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // 📈 Always recalculate level before saving
  this.level = this.calculateLevel();

  this.lastupdated_at = new Date();
  next();
});

// 📊 Level calculation
UserSchema.methods.calculateLevel = function () {
  return getLevelForKnowledgePoints(this.knowledgePoints);
};

module.exports = mongoose.model("User", UserSchema);
