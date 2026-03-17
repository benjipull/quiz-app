require("dotenv").config();
const { OLLAMA_MODEL, OLLAMA_PRESETS } = require("./ollamaPresets");
const localOllamaClient = require("./localOllamaClient");
const runpodOllamaClient = require("./runpodOllamaClient");

const OLLAMA_CLIENT_PROVIDER = (process.env.OLLAMA_CLIENT_PROVIDER || process.env.OLLAMA_CLIENT || "ollama")
  .trim()
  .toLowerCase();

function getClient(provider) {
  if (provider === "runpod") return runpodOllamaClient;
  if (provider === "ollama") return localOllamaClient;
  throw new Error(
    `Unknown OLLAMA_CLIENT_PROVIDER "${provider}". Supported values: "ollama", "runpod".`
  );
}

const activeClient = getClient(OLLAMA_CLIENT_PROVIDER);
const OLLAMA_URL = activeClient.OLLAMA_URL;

function assertOllamaSetup() {
  return activeClient.assertOllamaSetup();
}

function callOllama(params) {
  return activeClient.callOllama(params);
}

function getOllamaResponseText(response) {
  return activeClient.getOllamaResponseText(response);
}

function callOllamaForText(params) {
  return activeClient.callOllamaForText(params);
}

module.exports = {
  OLLAMA_URL,
  OLLAMA_MODEL,
  OLLAMA_PRESETS,
  OLLAMA_CLIENT_PROVIDER,
  assertOllamaSetup,
  callOllama,
  callOllamaForText,
  getOllamaResponseText,
};
