const { getOllamaResponseText } = require("./services/runpodOllamaClient");
const { getOllamaResponseText: getSharedOllamaResponseText } = require("./services/ollamaResponseText");

// Mock response from the new pod
const mockResponse = {
  data: {
    delayTime: 1068,
    executionTime: 223,
    id: "sync-43ca431c-d85b-49da-9f12-117fbdacaae6-e1",
    output: [
      {
        context: [128006, 9125, 128007],
        created_at: "2026-09-23T08:11:03.052327713Z",
        done: true,
        done_reason: "stop",
        eval_count: 2,
        eval_duration: 3003000,
        load_duration: 1213833,
        model: "llama3.2:3b",
        prompt_eval_count: 32,
        prompt_eval_duration: 6354000,
        response: "hello",
        total_duration: 62475771
      }
    ],
    status: "COMPLETED",
    workerId: "z8a227ccojc65l"
  }
};

console.log("Testing parser with mock response from new pod...\n");
const result = getOllamaResponseText(mockResponse);
console.log("Result:", result);
console.log("Type:", typeof result);
console.log("Success:", result === "hello" ? "✓ PASS" : "✗ FAIL");

// Test with JSON response
const mockJsonResponse = {
  data: {
    output: [
      {
        response: '{"question":"What is the capital of France?","correct_answer":"Paris","answers":["Paris","London","Berlin","Madrid"]}'
      }
    ]
  }
};

console.log("\nTesting parser with JSON response...\n");
const jsonResult = getOllamaResponseText(mockJsonResponse);
console.log("Result:", jsonResult);
console.log("Type:", typeof jsonResult);
console.log("Can parse as JSON:", (() => {
  try {
    JSON.parse(jsonResult);
    return "✓ PASS";
  } catch {
    return "✗ FAIL";
  }
})());

// Test with Qwen-style RunPod response where final JSON is in thinking.
const mockThinkingJsonResponse = {
  data: {
    delayTime: 57,
    executionTime: 42610,
    id: "sync-4f72a282-f808-4d14-be9d-bdc3432a49e1-e2",
    output: [
      {
        model: "qwen3.5:35b",
        response: "",
        thinking: "{\"question\":\"What completes the phrase: The Seven ___ of the World?\",\"answers\":[\"Wonders\",\"Continents\",\"Oceans\",\"Seas\"],\"correct_answer\":\"Wonders\",\"explanation\":\"The 'Seven Wonders' refers to a famous list of remarkable constructions from classical antiquity.\"}",
        done: true,
      },
    ],
    status: "COMPLETED",
    workerId: "45iuu86sq32ude",
  },
};

console.log("\nTesting parser with empty response and JSON in thinking...\n");
const thinkingJsonResult = getSharedOllamaResponseText(mockThinkingJsonResponse);
console.log("Result:", thinkingJsonResult);
console.log("Type:", typeof thinkingJsonResult);
console.log("Can parse thinking JSON:", (() => {
  try {
    const parsed = JSON.parse(thinkingJsonResult);
    return parsed.correct_answer === "Wonders" ? "PASS" : "FAIL";
  } catch {
    return "FAIL";
  }
})());
