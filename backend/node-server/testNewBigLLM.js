require("dotenv").config();
const axios = require("axios");
const { getOllamaResponseText } = require("./services/runpodOllamaClient");

const RUNPOD_URL = process.env.OLLAMA_URL;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

async function testNewBigLLM() {
  console.log("🚀 Testing new BIG LLM pod...\n");
  console.log("URL:", RUNPOD_URL);
  console.log("\n=== Test 1: Simple Response ===\n");

  const simplePayload = {
    input: {
      prompt: "Reply with exactly one word: hello"
    }
  };

  try {
    const response1 = await axios.post(RUNPOD_URL, simplePayload, {
      timeout: 120000,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`
      }
    });

    console.log("Model:", response1.data.output?.[0]?.model || "Unknown");
    console.log("Response:", getOllamaResponseText(response1));
    console.log("✓ Simple test passed!\n");

    console.log("=== Test 2: Question Generation (with JSON format) ===\n");

    const questionPayload = {
      input: {
        prompt: `Generate a trivia question about "Space" in JSON format.

Return ONLY valid JSON:
{
  "question": "Question text here",
  "answers": ["A", "B", "C", "D"],
  "correct_answer": "The correct answer",
  "explanation": "Brief explanation"
}`,
        format: "json",
        options: {
          num_ctx: 16384,
          temperature: 0.3,
          num_predict: 1024
        }
      }
    };

    const response2 = await axios.post(RUNPOD_URL, questionPayload, {
      timeout: 120000,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`
      }
    });

    const questionText = getOllamaResponseText(response2);
    console.log("Generated question:");
    console.log(questionText);

    try {
      const parsed = JSON.parse(questionText);
      console.log("\n✓ Valid JSON!");
      console.log("Question:", parsed.question);
      console.log("Correct Answer:", parsed.correct_answer);
    } catch (e) {
      console.log("\n✗ Failed to parse JSON:", e.message);
    }

  } catch (error) {
    console.error("✗ Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testNewBigLLM();
