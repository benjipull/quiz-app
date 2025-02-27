#!/bin/sh
set -x  # Debugging enabled

# Start Ollama explicitly using the config
OLLAMA_CONFIG=/etc/ollama/config.yaml /usr/local/bin/ollama serve &

echo "Waiting for Ollama to start..."
sleep 10

echo "Verify that Ollama is running"
if ! pgrep -x "ollama" > /dev/null; then
    echo "❌ Ollama did not start properly. Exiting..."
    exit 1
fi
echo "Ollama is running"

echo "Pulling Mistral"
/usr/local/bin/ollama pull mistral

# Keep container running
wait
