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

function buildPayload(categoryName) {
  return {
    input: {
      prompt: `A cartoon of ${categoryName}`,
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

function attachApiOutput(error, apiOutput) {
  if (!error || typeof error !== "object") return;
  error.apiOutput = apiOutput;
}

async function generateCategoryImageBase64(categoryName) {
  assertImageSetup();

  const payload = buildPayload(categoryName);
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
    raw: response.data,
  };
}

module.exports = {
  RUNPOD_IMAGE_URL,
  assertImageSetup,
  generateCategoryImageBase64,
};
