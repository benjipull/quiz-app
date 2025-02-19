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

echo "Starting Socat for external access..."
# Restart Socat (force it to ensure it's bound)
pkill socat  # Kill old instance (if any)
socat TCP-LISTEN:11440,fork,reuseaddr TCP:127.0.0.1:11434 &

# Keep container running
wait
