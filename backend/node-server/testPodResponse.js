require("dotenv").config();
const axios = require("axios");
const { getOllamaResponseText } = require("./services/runpodOllamaClient");

const RUNPOD_URL = "https://api.runpod.ai/v2/8938mh15zlir8d/runsync";
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

async function testPod() {
  console.log("Testing new RunPod endpoint...\n");

  const payload = {
    input: {
      prompt: "Reply with exactly one word: hello"
    }
  };

  try {
    const response = await axios.post(RUNPOD_URL, payload, {
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`
      }
    });

    console.log("=== FULL RESPONSE ===");
    console.log(JSON.stringify(response.data, null, 2));

    console.log("\n=== RESPONSE STRUCTURE ===");
    console.log("response.data type:", typeof response.data);
    console.log("response.data keys:", Object.keys(response.data || {}));

    if (response.data.output) {
      console.log("\nresponse.data.output type:", typeof response.data.output);
      console.log("response.data.output:", JSON.stringify(response.data.output, null, 2));

      if (typeof response.data.output === 'object') {
        console.log("response.data.output keys:", Object.keys(response.data.output || {}));
      }
    }

    console.log("\n=== TESTING CURRENT PARSER ===");
    const data = response?.data || {};
    const output = data.output;

    if (Array.isArray(output)) {
      console.log("Output is an array");
      const candidate = output?.[0]?.choices?.[0]?.text ?? output?.[0]?.text ?? output?.[0];
      console.log("Array candidate:", candidate, "Type:", typeof candidate);
    } else {
      console.log("Output is not an array");
    }

    const text =
      data?.output?.text ??
      data?.output?.response ??
      data?.output?.message?.content ??
      data?.response ??
      data?.message?.content ??
      "";

    console.log("\nExtracted text:", text);
    console.log("Extracted text type:", typeof text);

    if (typeof text === 'object' && text !== null) {
      console.log("Text is still an object! Keys:", Object.keys(text));
      console.log("Full text object:", JSON.stringify(text, null, 2));
    }

    console.log("\n=== TESTING UPDATED PARSER ===");
    const parsedText = getOllamaResponseText(response);
    console.log("Parsed text:", parsedText);
    console.log("Parsed text type:", typeof parsedText);
    console.log("Success:", parsedText === "hello" ? "✓" : "✗");

  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPod();
