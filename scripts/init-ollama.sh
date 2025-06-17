#!/bin/bash
echo "🤖 Initializing Ollama with required models..."

# Wait for Ollama service to be ready using ollama command instead of curl
echo "⏳ Waiting for Ollama service to be ready..."
while ! OLLAMA_HOST=http://ollama:11434 ollama list > /dev/null 2>&1; do
    echo "Waiting for Ollama..."
    sleep 5
done
echo "✅ Ollama service is ready!"

# Set Ollama host for all subsequent commands
export OLLAMA_HOST=http://ollama:11434

# Pull required models for InfraSim
echo "📥 Pulling llama3.2:latest model (main LLM)..."
ollama pull llama3.2:latest

echo "📥 Pulling nomic-embed-text:latest (for embeddings)..."
ollama pull nomic-embed-text:latest

echo "📥 Pulling phi3:mini model (lightweight alternative)..."
ollama pull phi3:mini

# Optional: Pull a larger model if you have resources
echo "📥 Pulling llama3.1:8b model (larger alternative)..."
ollama pull llama3.1:8b

echo "🎉 Ollama initialization completed!"
echo "📋 Available models:"
ollama list

echo "🔧 Testing model functionality..."
echo "Testing llama3.2:latest..."
echo "Hello, this is a test." | ollama run llama3.2:latest --verbose || echo "⚠️  llama3.2:latest test failed"

echo "Testing nomic-embed-text:latest..."
echo "test embedding" | ollama run nomic-embed-text:latest --verbose || echo "⚠️  nomic-embed-text:latest test failed"

echo "✅ Model testing completed!"