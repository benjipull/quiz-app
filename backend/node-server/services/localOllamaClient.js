require("dotenv").config();
const axios = require("axios");
const { OLLAMA_MODEL, OLLAMA_PRESETS } = require("./ollamaPresets");

const OLLAMA_URL = process.env.OLLAMA_URL;

function assertOllamaSetup() {
  if (!OLLAMA_URL) {
    throw new Error("Missing OLLAMA_URL in .env");
  }
}

function getPreset(presetName) {
  const preset = OLLAMA_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown Ollama preset: ${presetName}`);
  }
  return preset;
}

function buildPayload(prompt, preset, overrides = {}) {
  const payload = {
    model: overrides.model || preset.model || OLLAMA_MODEL,
    prompt,
    stream: overrides.stream ?? false,
  };

  const format = overrides.format !== undefined ? overrides.format : preset.format;
  if (format) {
    payload.format = format;
  }

  const options = {
    ...(preset.options || {}),
    ...(overrides.options || {}),
  };

  if (Object.keys(options).length > 0) {
    payload.options = options;
  }

  return payload;
}

async function callOllama({ prompt, presetName, overrides = {} }) {
  assertOllamaSetup();
  const preset = getPreset(presetName);
  const payload = buildPayload(prompt, preset, overrides);
  const timeout = overrides.timeoutMs ?? preset.timeoutMs ?? 180_000;

  return axios.post(OLLAMA_URL, payload, { timeout });
}

function getOllamaResponseText(response) {
  return String(response?.data?.response || "").trim();
}

async function callOllamaForText({ prompt, presetName, overrides = {} }) {
  const response = await callOllama({ prompt, presetName, overrides });
  return getOllamaResponseText(response);
}

module.exports = {
  OLLAMA_URL,
  assertOllamaSetup,
  callOllama,
  callOllamaForText,
  getOllamaResponseText,
};
