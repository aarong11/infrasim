#!/bin/bash

echo "🤖 Initializing Ollama with required models..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service to be ready..."
while ! curl -s http://ollama:11434/api/version > /dev/null 2>&1; do
    echo "Waiting for Ollama..."
    sleep 5
done

echo "✅ Ollama service is ready!"

# Pull required models
echo "📥 Pulling llama3.2:latest model..."
ollama pull llama3.2:latest

echo "📥 Pulling phi3:mini model (lightweight alternative)..."
ollama pull phi3:mini

echo "📥 Pulling nomic-embed-text:latest (for embeddings)..."
ollama pull nomic-embed-text:latest

echo "🎉 Ollama initialization completed!"
echo "Available models:"
ollama list