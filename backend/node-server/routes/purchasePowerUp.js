require("dotenv").config();
const express = require("express");
const User = require("../models/user");
const authenticateToken = require("../middleware/auth");
const { InventoryItemTypes } = require("../models/inventoryTypes");

const router = express.Router();

const POWERUP_PRICE = 250;

/**
 * POST /api/purchasePowerUp
 * Purchase a power-up with coins
 * Body: { powerUpType, quantity }
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { powerUpType, quantity = 1 } = req.body;

    // Validate power-up type
    if (!Object.values(InventoryItemTypes).includes(powerUpType)) {
      return res.status(400).json({ error: "Invalid power-up type." });
    }

    // Validate quantity
    const purchaseQuantity = Number.parseInt(String(quantity), 10);
    if (isNaN(purchaseQuantity) || purchaseQuantity < 1 || purchaseQuantity > 100) {
      return res.status(400).json({ error: "Invalid quantity. Must be between 1 and 100." });
    }

    const totalCost = POWERUP_PRICE * purchaseQuantity;

    // Find user and check if they have enough coins
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.coins < totalCost) {
      return res.status(400).json({
        error: "Not enough coins.",
        required: totalCost,
        current: user.coins,
        shortage: totalCost - user.coins
      });
    }

    // Deduct coins
    user.coins -= totalCost;

    // Add power-up to inventory
    user.addInventoryItem(powerUpType, purchaseQuantity);

    await user.save();

    return res.status(200).json({
      success: true,
      purchasedItem: powerUpType,
      quantity: purchaseQuantity,
      totalCost,
      remainingCoins: user.coins,
      inventory: user.inventory,
      newQuantity: user.getInventoryItem(powerUpType)
    });

  } catch (error) {
    console.error("❌ Error purchasing power-up:", error);
    return res.status(500).json({ error: "Server error. Please try again later." });
  }
});

module.exports = router;
