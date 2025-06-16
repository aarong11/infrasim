#!/bin/bash

echo "🚀 Starting Ethereum Simulation Environment..."

# Start Hardhat node in background
echo "📡 Starting Hardhat node on localhost:8545..."
npx hardhat node --hostname 0.0.0.0 --port 8545 &

# Get the PID of the Hardhat node
HARDHAT_PID=$!

# Wait for the node to be responsive
echo "⏳ Waiting for Hardhat node to be ready..."
while ! curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 > /dev/null 2>&1; do
  sleep 1
done

echo "✅ Hardhat node is ready!"

# Run deployment script
echo "📄 Running deployment script..."
npm run deploy

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "✅ Deployment completed successfully!"
else
  echo "❌ Deployment failed!"
fi

# Display deployment info if available
if [ -f "/data/deployed.json" ]; then
  echo "📋 Deployment Summary:"
  cat /data/deployed.json
fi

echo "🎉 Ethereum simulation environment is ready!"
echo "🔗 RPC Endpoint: http://localhost:8545"
echo "⚡ Chain ID: 31337"

# Keep the container alive by monitoring the Hardhat process
wait $HARDHAT_PID