#!/bin/bash
set -e

# Start Ollama server in background
ollama serve &
SERVE_PID=$!

# Wait for server to be ready
echo "Waiting for Ollama to start..."
until ollama list > /dev/null 2>&1; do
  sleep 1
done
echo "Ollama ready."

# Pull model if not already cached
if ! ollama list 2>/dev/null | grep -q "gemma2:2b"; then
  echo "Pulling gemma2:2b (~1.6 GB, first run only)..."
  ollama pull gemma2:2b
  echo "Model ready."
else
  echo "gemma2:2b already cached."
fi

# Keep server running
wait $SERVE_PID
