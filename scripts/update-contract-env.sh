#!/bin/bash

# Script to update environment variables with deployed contract addresses
echo "🔧 Updating environment with deployed contract addresses..."

# Check if deployed.json exists in the ethereum directory (new standard path)
if [ ! -f "ethereum/deployed.json" ]; then
    echo "❌ Error: ethereum/deployed.json not found. Please deploy contracts first."
    exit 1
fi

# Check if .env file exists, if not copy from .env.example
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "📄 Created .env file from .env.example"
    else
        echo "❌ Error: .env.example file not found"
        exit 1
    fi
fi

# Extract contract addresses using node - use the new standard path
CONTRACT_ADDRESSES=$(node -e "
const fs = require('fs');
try {
    const deployed = JSON.parse(fs.readFileSync('ethereum/deployed.json', 'utf8'));
    const contracts = deployed.contracts || {};
    console.log(JSON.stringify({
        apiRegistry: contracts.APIAccessRegistry?.address || '',
        contractRegistry: contracts.ContractRegistry?.address || '',
        daoFactory: contracts.DAOFactory?.address || '',
        usdc: contracts.USDC?.address || ''
    }));
} catch (error) {
    console.log('{}');
}
")

API_CONTRACT_ADDRESS=$(echo "$CONTRACT_ADDRESSES" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).apiRegistry)")
REGISTRY_CONTRACT_ADDRESS=$(echo "$CONTRACT_ADDRESSES" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).contractRegistry)")

# Update API_ACCESS_CONTRACT_ADDRESS
if [ -n "$API_CONTRACT_ADDRESS" ]; then
    if grep -q "^API_ACCESS_CONTRACT_ADDRESS=" .env; then
        sed -i '' "s/^API_ACCESS_CONTRACT_ADDRESS=.*/API_ACCESS_CONTRACT_ADDRESS=$API_CONTRACT_ADDRESS/" .env
        echo "✅ Updated API_ACCESS_CONTRACT_ADDRESS in .env file"
    else
        echo "API_ACCESS_CONTRACT_ADDRESS=$API_CONTRACT_ADDRESS" >> .env
        echo "✅ Added API_ACCESS_CONTRACT_ADDRESS to .env file"
    fi
    echo "📍 API Registry: $API_CONTRACT_ADDRESS"
fi

# Update CONTRACT_REGISTRY_ADDRESS
if [ -n "$REGISTRY_CONTRACT_ADDRESS" ]; then
    if grep -q "^CONTRACT_REGISTRY_ADDRESS=" .env; then
        sed -i '' "s/^CONTRACT_REGISTRY_ADDRESS=.*/CONTRACT_REGISTRY_ADDRESS=$REGISTRY_CONTRACT_ADDRESS/" .env
        echo "✅ Updated CONTRACT_REGISTRY_ADDRESS in .env file"
    else
        echo "CONTRACT_REGISTRY_ADDRESS=$REGISTRY_CONTRACT_ADDRESS" >> .env
        echo "✅ Added CONTRACT_REGISTRY_ADDRESS to .env file"
    fi
    echo "📍 Contract Registry: $REGISTRY_CONTRACT_ADDRESS"
fi

if [ -n "$API_CONTRACT_ADDRESS" ] || [ -n "$REGISTRY_CONTRACT_ADDRESS" ]; then
    echo "🎉 Environment configuration updated successfully!"
    echo "🔗 Your API endpoints will now use on-chain service discovery"
else
    echo "❌ Could not find contract addresses in deployment data"
    exit 1
fi