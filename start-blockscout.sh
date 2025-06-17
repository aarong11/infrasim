#!/bin/bash

echo "🚀 Starting InfraSim with Ethereum Lite Explorer..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start all services
echo "🔄 Starting all services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."

# Function to check service health
check_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=0
    
    echo "Checking $service..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "✅ $service is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "  Attempt $attempt/$max_attempts - waiting for $service..."
        sleep 5
    done
    
    echo "❌ $service failed to start within expected time"
    return 1
}

# Check Ethereum node
check_service "Ethereum RPC" "http://localhost:8545"

# Check Ethereum Lite Explorer
check_service "Ethereum Explorer" "http://localhost:4000"

# Check Web App
check_service "InfraSim Web" "http://localhost:3000/api/health"

echo ""
echo "🎉 All services are running!"
echo ""
echo "📋 Service URLs:"
echo "  • InfraSim Web:       http://localhost:3000"
echo "  • Ethereum Explorer:  http://localhost:4000"
echo "  • Ethereum RPC:       http://localhost:8545"
echo "  • Ollama:             http://localhost:11434"
echo ""
echo "📊 Useful Commands:"
echo "  • View logs:          docker-compose logs -f"
echo "  • View Explorer:      docker-compose logs -f explorer"
echo "  • Stop all:           docker-compose down"
echo "  • Rebuild:            docker-compose up --build"
echo ""
echo "🔍 The Ethereum Lite Explorer is optimized for standard JSON-RPC nodes like Hardhat."
echo "   It provides a clean interface for exploring blocks, transactions, and contracts."