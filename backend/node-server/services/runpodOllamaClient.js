require("dotenv").config();
const axios = require("axios");
const { OLLAMA_PRESETS } = require("./ollamaPresets");

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
  const payload = {
    input: {
      prompt,
      ...(overrides.input || {}),
    },
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

function getOllamaResponseText(response) {
  const data = response?.data || {};
  const output = data.output;

  if (Array.isArray(output)) {
    const candidate = output?.[0]?.choices?.[0]?.text ?? output?.[0]?.text ?? output?.[0];
    if (candidate !== undefined && candidate !== null) {
      return String(candidate).trim();
    }
  }

  const text =
    data?.output?.text ??
    data?.response ??
    data?.message?.content ??
    "";

  return String(text).trim();
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
