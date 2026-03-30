require("dotenv").config();
const axios = require("axios");

const RUNPOD_IMAGE_URL =
  process.env.RUNPOD_IMAGE_URL || "https://api.runpod.ai/v2/qq0glr1vb5p7y0/runsync";
const RUNPOD_IMAGE_API_KEY = process.env.RUNPOD_IMAGE_API_KEY || process.env.RUNPOD_API_KEY || "";

function assertImageSetup() {
  if (!RUNPOD_IMAGE_URL) {
    throw new Error("Missing RUNPOD_IMAGE_URL in .env");
  }

  if (!RUNPOD_IMAGE_API_KEY) {
    throw new Error("Missing RUNPOD_IMAGE_API_KEY (or RUNPOD_API_KEY) in .env");
  }
}

function buildPayloadForPrompt(prompt) {
  const safePrompt = String(prompt || "").trim();
  if (!safePrompt) {
    throw new Error("Image prompt cannot be empty.");
  }

  return {
    input: {
      prompt: safePrompt,
      negative_prompt: "blurry, low quality, deformed, ugly, text, watermark, signature",
      height: 512,
      width: 512,
      num_inference_steps: 1,
      guidance_scale: 0,
      seed: 1337,
      num_images: 1,
    },
  };
}

function buildCategoryPrompt(categoryName) {
  return `A cartoon of ${String(categoryName || "").trim()}`;
}

function buildQuestionImagePrompt(question, categoryName = "") {
  const text = String(question?.text || "").trim();
  const correctAnswer = String(question?.correct_answer || "").trim();
  const category = String(categoryName || "").trim();

  const subject = correctAnswer || text || "the trivia answer subject";
  const contextLine = text
    ? `Context: Trivia question "${text}".`
    : "";
  const categoryLine = category
    ? `Category: ${category}.`
    : "";

  return [
    `A clear, educational, family-friendly image of ${subject}.`,
    contextLine,
    categoryLine,
    "Single subject, centered composition, realistic or clean illustration style.",
    "No text, no labels, no logos, no watermark, no collage, no split-screen.",
  ]
    .filter(Boolean)
    .join(" ");
}

function attachApiOutput(error, apiOutput) {
  if (!error || typeof error !== "object") return;
  error.apiOutput = apiOutput;
}

async function generateImageBase64FromPrompt(prompt) {
  assertImageSetup();

  const payload = buildPayloadForPrompt(prompt);
  let response;
  try {
    response = await axios.post(RUNPOD_IMAGE_URL, payload, {
      timeout: 180_000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RUNPOD_IMAGE_API_KEY}`,
      },
    });
  } catch (error) {
    const wrappedError = new Error(
      `Image API request failed: ${error?.message || "Unknown error"}`,
    );
    attachApiOutput(wrappedError, error?.response?.data ?? null);
    throw wrappedError;
  }

  const imageBase64 = response?.data?.output?.images?.[0]?.image;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    const parseError = new Error(
      "Image API response did not contain output.images[0].image",
    );
    attachApiOutput(parseError, response?.data ?? null);
    throw parseError;
  }

  return {
    base64: imageBase64,
    prompt: String(prompt || "").trim(),
    raw: response.data,
  };
}

async function generateCategoryImageBase64(categoryName) {
  const prompt = buildCategoryPrompt(categoryName);
  return generateImageBase64FromPrompt(prompt);
}

async function generateQuestionImageBase64(question, categoryName = "") {
  const prompt = buildQuestionImagePrompt(question, categoryName);
  return generateImageBase64FromPrompt(prompt);
}

module.exports = {
  RUNPOD_IMAGE_URL,
  assertImageSetup,
  buildQuestionImagePrompt,
  generateImageBase64FromPrompt,
  generateCategoryImageBase64,
  generateQuestionImageBase64,
};
