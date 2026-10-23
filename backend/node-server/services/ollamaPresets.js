require("dotenv").config();

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3.5:35b";

const OLLAMA_PRESETS = Object.freeze({
  populateCategories: {
    timeoutMs: 240_000,
    format: "json",
    options: {
      temperature: 0.5,
      top_p: 0.9,
      top_k: 40,
      min_p: 0.05,
      repeat_penalty: 1.1,
      repeat_last_n: 256,
      num_predict: 1024,
    },
  },

  populateDifficulty: {
    timeoutMs: 180_000,
    format: "json",
    options: {
      temperature: 0.0,
      num_predict: 120,
    },
  },

  assignCategoryInterests: {
    timeoutMs: 180_000,
    options: {
      temperature: 0.1,
      num_predict: 120,
    },
  },

  classifyCategory: {
    timeoutMs: 180_000,
    options: {
      temperature: 0.0,
      num_predict: 120,
    },
  },

  validateQuestions: {
    timeoutMs: 180_000,
    format: "json",
    options: {
      temperature: 0.0,
      num_predict: 600,
    },
  },

  validateDuplicateQuestions: {
    timeoutMs: 180_000,
    format: "json",
    options: {
      temperature: 0.0,
      num_predict: 80,
    },
  },

  populateImageEligibility: {
    timeoutMs: 180_000,
    format: "json",
    options: {
      temperature: 0.0,
      num_predict: 180,
    },
  },

  fixQuestions: {
    timeoutMs: 240_000,
    format: "json",
    options: {
      temperature: 0.25,
      top_p: 0.9,
      top_k: 40,
      min_p: 0.05,
      repeat_penalty: 1.1,
      repeat_last_n: 256,
      num_predict: 768,
    },
  },
});

module.exports = {
  OLLAMA_MODEL,
  OLLAMA_PRESETS,
};