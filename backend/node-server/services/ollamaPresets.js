require("dotenv").config();

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

const OLLAMA_PRESETS = Object.freeze({
  populateCategories: {
    timeoutMs: 240_000,
    format: "json",
    options: {
      num_ctx: 4096,
      num_keep: 200,
      temperature: 0.25,
      top_p: 0.9,
      top_k: 40,
      min_p: 0.1,
      repeat_penalty: 1.1,
      repeat_last_n: 128,
      num_predict: 512,
    },
  },
  populateDifficulty: {
    timeoutMs: 180_000,
    format: "json",
    options: {
      num_ctx: 2048,
      num_keep: 100,
      temperature: 0.0,
      top_p: 0.9,
      top_k: 30,
      repeat_penalty: 1.1,
      repeat_last_n: 32,
      num_predict: 120,
    },
  },
  assignCategoryInterests: {
    timeoutMs: 180_000,
    options: {
      temperature: 0.2,
      top_p: 0.9,
      num_predict: 120,
    },
  },
  classifyCategory: {
    timeoutMs: 180_000,
  },
  validateQuestions: {
    timeoutMs: 180_000,
    format: "json",
    options: {
      temperature: 0.0,
      top_p: 0.85,
      top_k: 40,
      num_ctx: 2048,
      num_predict: 400,
      repeat_penalty: 1.1,
    },
  },
  validateDuplicateQuestions: {
    timeoutMs: 60_000,
    options: {
      temperature: 0.0,
      top_p: 0.8,
      top_k: 20,
      repeat_penalty: 1.2,
      num_ctx: 4096,
      num_predict: 60,
    },
  },
});

module.exports = {
  OLLAMA_MODEL,
  OLLAMA_PRESETS,
};
