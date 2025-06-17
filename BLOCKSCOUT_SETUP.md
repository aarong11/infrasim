# Blockscout Block Explorer Setup

This document explains how to run Blockscout alongside your InfraSim Ethereum environment for blockchain exploration and analysis.

## Overview

Blockscout is a comprehensive blockchain explorer that provides:
- 📊 Real-time block and transaction viewing
- 💰 Token balance tracking (including your USDC contract)
- 🔍 Contract interaction and verification
- 📈 Network statistics and analytics
- 🔗 Address and transaction search

## Quick Start

### Option 1: Use the Startup Script (Recommended)
```bash
./start-blockscout.sh
```

### Option 2: Manual Docker Compose
```bash
# Stop existing containers
docker-compose down

# Start all services including Blockscout
docker-compose up --build -d

# Check logs
docker-compose logs -f blockscout
```

## Services

The setup includes two new services:

### 1. PostgreSQL Database (`blockscout-db`)
- **Image**: `postgres:13.6`
- **Purpose**: Stores indexed blockchain data
- **Credentials**: `blockscout:blockscout@localhost`
- **Volume**: `blockscout-db` (persistent storage)

### 2. Blockscout Explorer (`blockscout`)
- **Image**: `blockscout/blockscout:latest`
- **Port**: `http://localhost:4000`
- **RPC Connection**: `http://ethereum-sim:8545`
- **Network**: InfraSim (Chain ID: 31337)

## Configuration

### Chain Settings
- **Network Name**: InfraSim
- **Coin Symbol**: SIM
- **Chain ID**: 31337
- **RPC Endpoint**: Internal Docker network connection to Hardhat

### Features Enabled
- ✅ Web Application (Block Explorer UI)
- ✅ Read API (for external integrations)
- ✅ Write API (for contract verification)
- ✅ Indexer (automatic blockchain scanning)
- ❌ Pending Transaction Fetcher (disabled for performance)

## Accessing the Explorer

Once started, you can access:

1. **Main Explorer**: http://localhost:4000
2. **Health Check**: http://localhost:4000/api/v1/health/liveness
3. **API Documentation**: http://localhost:4000/api-docs

## What You'll See

### Immediate Availability
- 🔄 Real-time block production from Hardhat
- 📋 Transaction history
- 💳 Account balances and transfers
- 🏭 Network statistics

### Your Deployed Contracts
- **USDC Token**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **BridgeVault**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

### Token Tracking
Blockscout will automatically detect and track:
- USDC transfers and balances
- Contract interactions with BridgeVault
- All ERC-20 token activities

## Troubleshooting

### Startup Issues
```bash
# Check service status
docker-compose ps

# View logs for specific service
docker-compose logs blockscout
docker-compose logs blockscout-db

# Restart services
docker-compose restart blockscout
```

### Database Issues
```bash
# Reset PostgreSQL data (warning: loses indexed data)
docker-compose down
docker volume rm infrasim_blockscout-db
docker-compose up -d
```

### Indexing Problems
```bash
# Check if RPC connection is working
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545

# View indexer logs
docker-compose logs -f blockscout | grep -i index
```

## Performance Notes

- **Initial Sync**: May take 2-5 minutes to index existing blocks
- **Memory Usage**: PostgreSQL and Blockscout will use ~500MB RAM combined
- **Storage**: Database grows with blockchain data (minimal for local dev)

## Development Integration

### API Access
Blockscout provides REST APIs for integration:
```bash
# Get latest block
curl http://localhost:4000/api/v2/blocks

# Get address info
curl http://localhost:4000/api/v2/addresses/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Get transaction details
curl http://localhost:4000/api/v2/transactions/{tx_hash}
```

### Contract Verification
You can verify your deployed contracts through the UI:
1. Navigate to contract address
2. Click "Verify & Publish"
3. Upload Solidity source code
4. Configure compiler settings

## URLs Reference

| Service | URL | Purpose |
|---------|-----|---------|
| InfraSim Web | http://localhost:3000 | Main application |
| Blockscout Explorer | http://localhost:4000 | Blockchain explorer |
| Ethereum RPC | http://localhost:8545 | JSON-RPC endpoint |
| Ollama AI | http://localhost:11434 | AI services |

## Stopping Services

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (reset everything)
docker-compose down -v
```