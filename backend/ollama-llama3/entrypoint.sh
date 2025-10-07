#!/bin/bash
set -e

# Start Ollama server in the background
ollama serve &
PID=$!

# Give server time to boot
sleep 5

# Pull Llama3 model if not already present
if ! ollama list | grep -q "llama3"; then
  echo ">>> Pulling llama3 model..."
  curl -s -X POST http://127.0.0.1:11434/api/pull \
    -H "Content-Type: application/json" \
    -d '{"name":"llama3"}'
else
  echo ">>> llama3 already present, skipping pull."
fi

# Bring ollama server back to foreground
wait $PID
