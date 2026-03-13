#!/bin/bash
set -e

# Start Ollama server in the background
ollama serve &
PID=$!

# Give server time to boot
sleep 5

# Pull Qwen3 8B model if not already present
if ! ollama list | grep -q "qwen3:8b"; then
  echo ">>> Pulling qwen3:8b model..."
  curl -s -X POST http://127.0.0.1:11434/api/pull \
    -H "Content-Type: application/json" \
    -d '{"name":"qwen3:8b"}'
else
  echo ">>> qwen3:8b already present, skipping pull."
fi

# Bring ollama server back to foreground
wait $PID
