#!/bin/bash

echo "🚀 Starting Ethereum Simulation Environment..."

# Create blockchain data directory if it doesn't exist
mkdir -p /data/blockchain
mkdir -p /data/accounts

# Check if we have existing blockchain state to restore
STATE_FILE="/data/blockchain/state.json"
ACCOUNTS_FILE="/data/accounts/accounts.json"

# Function to save blockchain state
save_state() {
  echo "💾 Saving blockchain state..."
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"hardhat_dumpState","params":[],"id":1}' \
    http://localhost:8545 | jq '.result' > "$STATE_FILE" 2>/dev/null || echo "⚠️  Could not save state"
}

# Function to restore blockchain state
restore_state() {
  if [ -f "$STATE_FILE" ] && [ -s "$STATE_FILE" ]; then
    echo "📁 Restoring blockchain state from previous session..."
    sleep 2  # Wait for node to be fully ready
    curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "{\"jsonrpc\":\"2.0\",\"method\":\"hardhat_loadState\",\"params\":[$(cat "$STATE_FILE")],\"id\":1}" \
      http://localhost:8545 > /dev/null 2>&1 && echo "✅ State restored successfully" || echo "⚠️  Could not restore state"
  fi
}

# Function to handle shutdown gracefully
cleanup() {
  echo "🛑 Shutting down services..."
  save_state
  kill $HARDHAT_PID 2>/dev/null
  kill $DEPLOYMENT_SERVER_PID 2>/dev/null
  exit 0
}

# Set up signal handlers early
trap cleanup SIGTERM SIGINT

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

# Restore previous state if available
restore_state

# Check if contracts are already deployed by looking for existing deployment data
if [ -f "/data/deployed.json" ] && [ -s "/data/deployed.json" ]; then
  echo "📋 Found existing deployment data, skipping contract deployment..."
  cat /data/deployed.json
else
  # Run deployment scripts
  echo "📄 Running core contract deployment..."
  npm run deploy

  # Check if core deployment was successful
  if [ $? -eq 0 ]; then
    echo "✅ Core deployment completed successfully!"
    
    # Deploy DAO Factory using JavaScript version
    echo "🏭 Deploying DAO Factory..."
    npx hardhat run scripts/deploy-dao-factory.js --network localhost
    
    if [ $? -eq 0 ]; then
      echo "✅ DAO Factory deployment completed successfully!"
    else
      echo "⚠️  DAO Factory deployment failed, but continuing with core contracts"
    fi
    
    # Save state after deployment
    save_state
  else
    echo "❌ Core deployment failed!"
  fi
fi

# Start deployment server in background
echo "📊 Starting deployment data server on localhost:8546..."
node deployment-server.js &

# Get the PID of the deployment server
DEPLOYMENT_SERVER_PID=$!

# Wait a moment for the deployment server to start
sleep 2

# Display deployment info if available
if [ -f "/data/deployed.json" ]; then
  echo "📋 Deployment Summary:"
  cat /data/deployed.json
fi

echo "🎉 Ethereum simulation environment is ready!"
echo "🔗 RPC Endpoint: http://localhost:8545"
echo "📊 Deployment API: http://localhost:8546"
echo "⚡ Chain ID: 31337"
echo "💾 State persistence: ENABLED"

# Periodically save state (every 5 minutes)
while kill -0 $HARDHAT_PID 2>/dev/null && kill -0 $DEPLOYMENT_SERVER_PID 2>/dev/null; do
  sleep 300  # 5 minutes
  save_state
done

echo "⚠️ One of the services stopped, shutting down..."
cleanup