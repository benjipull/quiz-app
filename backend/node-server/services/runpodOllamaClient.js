require("dotenv").config();
const axios = require("axios");
const { OLLAMA_PRESETS } = require("./ollamaPresets");
const { getOllamaResponseText } = require("./ollamaResponseText");

const RUNPOD_OLLAMA_URL = process.env.RUNPOD_OLLAMA_URL || process.env.OLLAMA_URL;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || "";

function assertOllamaSetup() {
  if (!RUNPOD_OLLAMA_URL) {
    throw new Error("Missing RUNPOD_OLLAMA_URL (or OLLAMA_URL) in .env");
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
  const inputObj = {
    prompt,
    ...(overrides.input || {}),
  };

  // Add format to input if specified
  const format = overrides.format !== undefined ? overrides.format : preset.format;
  if (format) {
    inputObj.format = format;
  }

  // Add options to input if specified
  const options = {
    ...(preset.options || {}),
    ...(overrides.options || {}),
  };
  if (Object.keys(options).length > 0) {
    inputObj.options = options;
  }

  const payload = {
    input: inputObj,
    stream: overrides.stream ?? false,
  };

  return payload;
}

function buildHeaders(overrides = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(overrides.headers || {}),
  };

  if (RUNPOD_API_KEY && !headers.Authorization) {
    headers.Authorization = `Bearer ${RUNPOD_API_KEY}`;
  }

  return headers;
}

async function callOllama({ prompt, presetName, overrides = {} }) {
  assertOllamaSetup();
  const preset = getPreset(presetName);
  const payload = buildPayload(prompt, preset, overrides);
  const timeout = overrides.timeoutMs ?? preset.timeoutMs ?? 180_000;
  const headers = buildHeaders(overrides);

  return axios.post(RUNPOD_OLLAMA_URL, payload, { timeout, headers });
}

async function callOllamaForText({ prompt, presetName, overrides = {} }) {
  const response = await callOllama({ prompt, presetName, overrides });
  return getOllamaResponseText(response);
}

module.exports = {
  OLLAMA_URL: RUNPOD_OLLAMA_URL,
  assertOllamaSetup,
  callOllama,
  callOllamaForText,
  getOllamaResponseText,
};
