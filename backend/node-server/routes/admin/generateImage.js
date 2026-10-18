const express = require("express");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");
const {
  MIN_IMAGE_SIZE,
  MAX_IMAGE_SIZE,
  IMAGE_SIZE_STEP,
  DEFAULT_NEGATIVE_PROMPT,
  normalizeSquareSize,
  generateImageBase64FromPrompt,
} = require("../../services/imageClient");

const router = express.Router();

// POST /api/admin/images/generate
router.post("/generate", auth, adminAuth, async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required." });
    }

    const size = normalizeSquareSize(req.body?.size);
    const negativePrompt = String(req.body?.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT).trim();
    const generated = await generateImageBase64FromPrompt(prompt, { size, negativePrompt });

    return res.json({
      prompt: generated.prompt,
      negativePrompt: generated.negativePrompt,
      size: generated.size,
      imageBase64: generated.base64,
    });
  } catch (error) {
    const message = String(error?.message || "Failed to generate image.");
    const isValidationError =
      message.includes("Image prompt cannot be empty.") ||
      message.includes("Image size must be an integer");

    const payload = {
      message: isValidationError
        ? message
        : "Image generation failed. Please try again.",
    };

    if (!isValidationError && error?.apiOutput) {
      payload.apiOutput = error.apiOutput;
    }

    return res.status(isValidationError ? 400 : 502).json(payload);
  }
});

router.get("/sizes", auth, adminAuth, (_req, res) => {
  const sizes = [];
  for (let size = MIN_IMAGE_SIZE; size <= MAX_IMAGE_SIZE; size += IMAGE_SIZE_STEP) {
    sizes.push(size);
  }

  res.json({ sizes });
});

module.exports = router;
