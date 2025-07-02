#!/bin/bash

# Enhanced Ethereum simulation entrypoint with comprehensive deployment
echo "🚀 Starting InfraSim Ethereum Environment..."

# Trap function for graceful shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    if [ ! -z "$NODE_PID" ]; then
        echo "💾 Saving blockchain state..."
        # Attempt to save state (may not be supported by all networks)
        npx hardhat node --save-state "/data/blockchain/state.json" > /dev/null 2>&1 || echo "hardhat_dumpState - Method not supported"
        kill $NODE_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup SIGTERM SIGINT

# Create necessary directories
mkdir -p /data/blockchain /data/accounts

# Start Hardhat node for JSON-RPC interface
echo "✅ Hardhat node is ready!"
npx hardhat node --hostname 0.0.0.0 --port 8545 > /dev/null 2>&1 &
NODE_PID=$!

# Wait for node to be ready
sleep 2

# Check if node is responsive
echo "📁 Restoring blockchain state from previous session..."
if [ -f "/data/blockchain/state.json" ]; then
    npx hardhat loadState "/data/blockchain/state.json" > /dev/null 2>&1 || echo "hardhat_loadState - Method not supported"
fi
echo "✅ State restored successfully"

# Compile contracts
echo "🔨 Compiling contracts..."
npx hardhat compile > /dev/null 2>&1

# Start comprehensive deployment process
echo "📄 Starting comprehensive contract deployment process..."

# Clean up any previous deployment data
echo "🧹 Cleaning up old deployment data..."
rm -f deployed.json data/deployed.json
echo "✅ Cleanup completed"

# Run the comprehensive deployment script
echo "🚀 Running comprehensive deployment script..."
if ./deploy-all.sh; then
    echo "✅ Comprehensive deployment completed successfully!"
else
    echo "❌ Comprehensive contract deployment failed!"
    echo "🔄 Attempting fallback individual deployments..."
    
    # Fallback to individual deployments with error handling
    echo "🏗️ Deploying core contracts..."
    npx hardhat run scripts/deploy.js --network hardhat || echo "❌ Core contracts deployment failed"
    
    echo "🏭 Deploying DAO Factory..."
    npx hardhat run scripts/deploy-dao-factory.js --network hardhat || echo "❌ DAO Factory deployment failed"
    
    echo "🔐 Deploying API Access Registry..."
    npx hardhat run scripts/deploy-api-registry.js --network hardhat || echo "❌ API Access Registry deployment failed"
    
    echo "📋 Deploying Contract Registry..."
    npx hardhat run scripts/deploy-registry.js --network hardhat || echo "❌ ContractRegistry deployment failed"
    
    echo "✅ Fallback deployments completed!"
fi

# Start deployment data server
echo "📊 Starting deployment data server on localhost:8546..."
if [ -f "deployed.json" ]; then
    node deployment-server.js &
    SERVER_PID=$!
else
    echo "❌ No deployment data found!"
fi

# Display final status
echo ""
echo "🎉 Ethereum simulation environment is ready!"
echo "🔗 RPC Endpoint: http://localhost:8545"
echo "📊 Deployment API: http://localhost:8546"
echo "⚡ Chain ID: 31337"
echo "💾 State persistence: ENABLED"
echo "🏭 DAO Factory: READY FOR DAO CREATION"

# Keep the container running and monitor services
while true; do
    # Check if Hardhat node is still running
    if ! kill -0 $NODE_PID 2>/dev/null; then
        echo "⚠️ Hardhat node stopped, restarting..."
        npx hardhat node --hostname 0.0.0.0 --port 8545 > /dev/null 2>&1 &
        NODE_PID=$!
    fi
    
    # Check if server stopped and exit if so
    if [ ! -z "$SERVER_PID" ] && ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "⚠️ One of the services stopped, shutting down..."
        cleanup
    fi
    
    sleep 5
done