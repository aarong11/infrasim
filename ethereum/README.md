# Ethereum Simulation Environment

This directory contains a persistent, containerized Ethereum simulation environment using Hardhat, designed for infrastructure simulation within InfraSim.

## Overview

- **Docker-based Hardhat localnet** running on port 8545
- **Persistent blockchain state** and contract artifacts
- **Two pre-deployed smart contracts**: USDC token and BridgeVault
- **Automated deployment** with 100 USDC deposited into the vault
- **Skip re-deployment** if contracts already exist

## Quick Start

```bash
# Start the Ethereum simulation environment
docker-compose up -d

# View logs
docker-compose logs -f ethereum-sim

# Stop the environment
docker-compose down
```

## Contracts

### USDC Token (`contracts/USDC.sol`)
- **Symbol**: USDC
- **Decimals**: 6
- **Total Supply**: 1,000,000 USDC (minted to deployer)
- **OpenZeppelin ERC20** implementation with owner minting capability

### Bridge Vault (`contracts/BridgeVault.sol`)
- **Owner-only** deposit and withdrawal functions
- **Reentrancy protection** using OpenZeppelin's ReentrancyGuard
- **Event logging** for all deposits and withdrawals
- **Balance query** function for any ERC20 token

## Deployment Process

1. **Check existing deployment**: Skips if `/data/deployed.json` exists
2. **Deploy USDC contract**: Mints 1M tokens to deployer
3. **Deploy BridgeVault contract**: Owner-controlled vault
4. **Approve and deposit**: 100 USDC transferred to vault
5. **Save addresses**: Contract addresses saved to `/data/deployed.json`

## Persistence

All blockchain state and artifacts are stored in the `./data` directory:
- `./data/deployed.json` - Contract addresses and deployment info
- `./data/artifacts/` - Compiled contract artifacts
- `./data/cache/` - Hardhat compilation cache

## Network Configuration

- **Chain ID**: 31337 (Hardhat default)
- **RPC Endpoint**: http://localhost:8545
- **Pre-funded accounts**: 20 accounts with 10,000 ETH each

## Usage in InfraSim

This environment provides a realistic blockchain backend for:
- **DeFi protocol simulation**
- **Cross-chain bridge testing** 
- **Token transfer scenarios**
- **Smart contract interaction patterns**

The deployed contracts can be integrated into InfraSim's infrastructure modeling system to simulate financial services and blockchain-based applications.