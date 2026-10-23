require("dotenv").config();
const axios = require("axios");
const { getOllamaResponseText } = require("./services/runpodOllamaClient");

const RUNPOD_URL = process.env.OLLAMA_URL;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

// Use the actual prompt from your question generation
const testPrompt = `Generate a trivia question about "Flowers" in JSON format.

Return ONLY valid JSON with this exact structure:
{
  "question": "The question text here",
  "answers": ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
  "correct_answer": "The correct answer",
  "explanation": "Brief explanation"
}

Make it interesting and educational.`;

async function testRealQuestion() {
  console.log("Testing with actual question generation prompt...\n");
  console.log("Using URL:", RUNPOD_URL);
  console.log("\n=== SENDING REQUEST ===\n");

  const payload = {
    input: {
      prompt: testPrompt
    },
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
    }
  };

  try {
    const response = await axios.post(RUNPOD_URL, payload, {
      timeout: 120000,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`
      }
    });

    console.log("=== FULL RESPONSE ===");
    console.log(JSON.stringify(response.data, null, 2));

    console.log("\n=== EXTRACTED TEXT ===");
    const extractedText = getOllamaResponseText(response);
    console.log("Extracted text:");
    console.log(extractedText);
    console.log("\nText length:", extractedText.length);
    console.log("Text type:", typeof extractedText);

    console.log("\n=== ATTEMPTING TO PARSE AS JSON ===");
    try {
      const parsed = JSON.parse(extractedText);
      console.log("✓ Successfully parsed as JSON");
      console.log("Parsed object:", JSON.stringify(parsed, null, 2));
    } catch (parseError) {
      console.log("✗ Failed to parse as JSON");
      console.log("Parse error:", parseError.message);
      console.log("\nFirst 200 chars:", extractedText.substring(0, 200));
      console.log("Last 200 chars:", extractedText.substring(Math.max(0, extractedText.length - 200)));

      // Check for incomplete JSON
      const openBraces = (extractedText.match(/{/g) || []).length;
      const closeBraces = (extractedText.match(/}/g) || []).length;
      console.log("\nBrace count - Open:", openBraces, "Close:", closeBraces);

      if (openBraces !== closeBraces) {
        console.log("⚠️ INCOMPLETE JSON - missing closing braces");
      }
    }

  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRealQuestion();
