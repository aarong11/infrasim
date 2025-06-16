# InfraSim Docker Environment

A complete containerized infrastructure simulation environment with AI-powered agents, blockchain integration, and web interface.

## 🏗️ Architecture

The InfraSim environment consists of four main services:

### 1. **Web Application** (`infrasim-web`)
- **Port**: 3000
- **Technology**: Next.js with TypeScript
- **Features**: 
  - Infrastructure modeling interface
  - AI agent management
  - Real-time simulation controls
  - Vector memory system
  - Plugin architecture

### 2. **Ollama AI Service** (`infrasim-ollama`)
- **Port**: 11434
- **Technology**: Ollama AI runtime
- **Models**: 
  - `llama3.2:latest` - Main conversational AI
  - `phi3:mini` - Lightweight alternative
  - `nomic-embed-text:latest` - Text embeddings

### 3. **Ethereum Simulation** (`infrasim-ethereum`)
- **Port**: 8545
- **Technology**: Hardhat local blockchain
- **Features**:
  - Persistent blockchain state
  - Pre-deployed USDC token contract
  - Bridge vault contract
  - 20 pre-funded accounts (10,000 ETH each)

### 4. **Ollama Initializer** (`infrasim-ollama-init`)
- **Purpose**: Downloads and configures AI models
- **Runtime**: One-time initialization container

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- At least 8GB RAM available
- 10GB+ free disk space (for AI models)

### Start the Environment
```bash
# Start all services
./start-infrasim.sh start

# Or use docker-compose directly
docker-compose up -d
```

### Access Services
- **Web Interface**: http://localhost:3000
- **Ollama API**: http://localhost:11434
- **Ethereum RPC**: http://localhost:8545
- **Health Check**: http://localhost:3000/api/health

## 📋 Management Commands

```bash
# Environment management
./start-infrasim.sh start     # Start all services
./start-infrasim.sh stop      # Stop all services
./start-infrasim.sh restart   # Restart all services
./start-infrasim.sh status    # Show service status
./start-infrasim.sh logs      # View real-time logs
./start-infrasim.sh clean     # Clean up containers/volumes
./start-infrasim.sh build     # Rebuild containers
./start-infrasim.sh help      # Show help
```

## 🔗 Service Communication

All services communicate through the `infrasim-network` Docker network:

- **Web → Ollama**: `http://ollama:11434`
- **Web → Ethereum**: `http://ethereum-sim:8545`
- **Internal DNS**: Container names resolve to internal IPs

Environment variables in web container:
- `OLLAMA_BASE_URL=http://ollama:11434`
- `ETHEREUM_RPC_URL=http://ethereum-sim:8545`

## 💾 Data Persistence

### Web Application
- **Volume**: `./data:/app/data`
- **Contains**: Vector store, company data, simulation state

### Ethereum Simulation
- **Volume**: `./ethereum/data:/data`
- **Contains**: Blockchain state, contract artifacts, deployment info

### Ollama AI Models
- **Volume**: `ollama-data` (named volume)
- **Contains**: Downloaded AI models (~5-10GB)

## 🔍 Health Monitoring

Each service includes health checks:

```bash
# Check individual service health
curl http://localhost:3000/api/health    # Web app
curl http://localhost:11434/api/version  # Ollama
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545                  # Ethereum
```

## 🛠️ Development

### Local Development vs Docker

**Docker (Recommended for Production-like Testing)**:
```bash
./start-infrasim.sh start
```

**Local Development**:
```bash
# Requires local Ollama installation
yarn dev
```

### Rebuilding After Changes

```bash
# Rebuild specific service
docker-compose build web
docker-compose up -d web

# Rebuild all services
./start-infrasim.sh build
./start-infrasim.sh restart
```

## 🎯 Use Cases

### Infrastructure Simulation
- Model complex enterprise architectures
- Test disaster recovery scenarios
- Simulate network failures and recovery
- Capacity planning and optimization

### AI-Powered Analysis
- Natural language infrastructure queries
- Automated compliance checking
- Performance optimization suggestions
- Risk assessment and mitigation

### Blockchain Integration
- DeFi protocol simulation
- Cross-chain bridge testing
- Token economics modeling
- Smart contract integration testing

## 🚨 Troubleshooting

### Common Issues

**Services not starting**:
```bash
# Check Docker status
docker info

# View service logs
./start-infrasim.sh logs

# Clean and restart
./start-infrasim.sh clean
./start-infrasim.sh start
```

**Ollama models not downloading**:
```bash
# Check ollama-init logs
docker-compose logs ollama-init

# Manually pull models
docker-compose exec ollama ollama pull llama3.2:latest
```

**Web app build failures**:
```bash
# Clear and rebuild
docker-compose build --no-cache web
```

### Resource Requirements

**Minimum**:
- 4GB RAM
- 5GB disk space
- 2 CPU cores

**Recommended**:
- 8GB+ RAM
- 15GB+ disk space
- 4+ CPU cores

## 📊 Monitoring

### Resource Usage
```bash
# Container resource usage
docker stats

# Service status
./start-infrasim.sh status
```

### Log Management
```bash
# Follow all logs
./start-infrasim.sh logs

# Specific service logs
docker-compose logs -f web
docker-compose logs -f ollama
docker-compose logs -f ethereum-sim
```

## 🔧 Configuration

### Environment Variables

Create `.env` file for custom configuration:
```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODELS=llama3.2:latest,phi3:mini

# Ethereum Configuration
ETHEREUM_RPC_URL=http://ethereum-sim:8545
ETHEREUM_CHAIN_ID=31337

# Web Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Custom Models

Add to `scripts/init-ollama.sh`:
```bash
ollama pull your-custom-model:latest
```

## 📝 API Integration

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

### Ollama API
```bash
curl http://localhost:11434/api/version
curl -X POST http://localhost:11434/api/generate \
  -d '{"model":"llama3.2:latest","prompt":"Hello"}'
```

### Ethereum RPC
```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```