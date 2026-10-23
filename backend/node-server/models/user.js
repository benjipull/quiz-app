const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { getLevelForKnowledgePoints } = require("../config/levelConfig");
const { InventoryItemTypes } = require("./inventoryTypes");

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

  // 🎒 Player Inventory - Power-ups and items
  inventory: {
    type: [
      {
        itemType: {
          type: String,
          enum: Object.values(InventoryItemTypes),
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          default: 0,
          min: 0
        }
      }
    ],
    default: () => [
      { itemType: InventoryItemTypes.ASK_THE_AUDIENCE, quantity: 10 },
      { itemType: InventoryItemTypes.SWAP_QUESTION, quantity: 10 },
      { itemType: InventoryItemTypes.DIFFICULTY_SWAP, quantity: 10 },
      { itemType: InventoryItemTypes.FIFTY_FIFTY, quantity: 10 }
    ]
  },

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

// 🎒 Inventory Methods

/**
 * Get quantity of a specific item in inventory
 * @param {string} itemType - The type of item (from InventoryItemTypes)
 * @returns {number} The quantity of the item (0 if not found)
 */
UserSchema.methods.getInventoryItem = function (itemType) {
  const item = this.inventory.find(i => i.itemType === itemType);
  return item ? item.quantity : 0;
};

/**
 * Check if player has at least a certain quantity of an item
 * @param {string} itemType - The type of item (from InventoryItemTypes)
 * @param {number} quantity - Minimum quantity to check for (default: 1)
 * @returns {boolean} True if player has at least the specified quantity
 */
UserSchema.methods.hasInventoryItem = function (itemType, quantity = 1) {
  return this.getInventoryItem(itemType) >= quantity;
};

/**
 * Add items to player's inventory
 * @param {string} itemType - The type of item (from InventoryItemTypes)
 * @param {number} quantity - Amount to add (default: 1)
 */
UserSchema.methods.addInventoryItem = function (itemType, quantity = 1) {
  const item = this.inventory.find(i => i.itemType === itemType);
  if (item) {
    item.quantity += quantity;
  } else {
    this.inventory.push({ itemType, quantity });
  }
};

/**
 * Remove items from player's inventory
 * @param {string} itemType - The type of item (from InventoryItemTypes)
 * @param {number} quantity - Amount to remove (default: 1)
 * @returns {boolean} True if successful, false if insufficient quantity
 */
UserSchema.methods.removeInventoryItem = function (itemType, quantity = 1) {
  const item = this.inventory.find(i => i.itemType === itemType);
  if (!item || item.quantity < quantity) {
    return false;
  }
  item.quantity -= quantity;
  // Remove item from array if quantity reaches 0
  if (item.quantity === 0) {
    this.inventory = this.inventory.filter(i => i.itemType !== itemType);
  }
  return true;
};

/**
 * Use an inventory item (removes 1 from inventory)
 * @param {string} itemType - The type of item (from InventoryItemTypes)
 * @returns {boolean} True if successful, false if item not available
 */
UserSchema.methods.useInventoryItem = function (itemType) {
  return this.removeInventoryItem(itemType, 1);
};

module.exports = mongoose.model("User", UserSchema);
