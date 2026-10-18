require("dotenv").config();
const { callOllama, getOllamaResponseText } = require("./services/runpodOllamaClient");

async function testResponse() {
  try {
    const response = await callOllama({
      prompt: "What is the capital of France?",
      presetName: "populateCategories",
    });

    console.log("=== FULL RESPONSE ===");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("\n=== EXTRACTED TEXT ===");
    const text = getOllamaResponseText(response);
    console.log(text || "(empty/null)");
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testResponse();
