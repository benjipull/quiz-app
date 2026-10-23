require("dotenv").config();
const axios = require("axios");

const RUNPOD_URL = process.env.OLLAMA_URL;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

async function testResponse() {
  console.log("Testing response structure...\n");

  const payload = {
    input: {
      prompt: "Reply with: hello"
    }
  };

  try {
    const response = await axios.post(RUNPOD_URL, payload, {
      timeout: 180000,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`
      }
    });

    console.log("=== FULL RESPONSE ===");
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testResponse();
