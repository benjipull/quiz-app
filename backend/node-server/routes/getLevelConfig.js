const express = require("express");
const router = express.Router();
const { levels } = require("../config/levelConfig");

// GET /api/level-config
router.get("/", (req, res) => {
  return res.status(200).json({ levels });
});

module.exports = router;
