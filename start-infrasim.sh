#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# InfraSim Environment Manager
echo -e "${BLUE}🚀 InfraSim Environment Manager${NC}"
echo "=================================="

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start all InfraSim services"
    echo "  stop      Stop all InfraSim services"
    echo "  restart   Restart all InfraSim services"
    echo "  status    Show status of all services"
    echo "  logs      Show logs from all services"
    echo "  clean     Clean up containers and volumes"
    echo "  build     Build all containers"
    echo "  help      Show this help message"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🔄 Starting InfraSim services...${NC}"
    docker-compose up -d --build
    
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    
    # Wait for services to be healthy
    echo "Checking service health..."
    
    # Check Hardhat Polygon node
    echo -n "Hardhat Polygon testnet: "
    timeout=120
    while [ $timeout -gt 0 ]; do
        if curl -s -X POST -H "Content-Type: application/json" \
           --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
           http://localhost:8545 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Ready${NC}"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    # Check Ollama
    echo -n "Ollama AI service: "
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Ready${NC}"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    # Check Web App
    echo -n "Web application: "
    timeout=120
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Ready${NC}"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    echo ""
    echo -e "${GREEN}🎉 InfraSim is ready!${NC}"
    echo ""
    echo "📱 Services available at:"
    echo "  • Web App:           http://localhost:3000"
    echo "  • Hardhat RPC:       http://localhost:8545"
    echo "  • Deployment API:    http://localhost:8546"
    echo "  • Ollama API:        http://localhost:11434"
    echo "  • Matrix:            http://localhost:8008"
    echo ""
    echo "🔗 Blockchain Configuration:"
    echo "  • Network:           Polygon Mumbai Testnet (Local)"
    echo "  • Chain ID:          80001 (configurable)"
    echo "  • Block Time:        2 seconds (configurable)"
    echo "  • Pre-funded:        20 accounts with 10,000 ETH each"
    echo "  • DAO Factory:       Ready for deployment"
    echo ""
    echo "🎯 First-time setup:"
    echo "  Visit http://localhost:3000 to configure your network and admin wallet"
    echo ""
    echo "📋 Quick commands:"
    echo "  • View logs:         ./start-infrasim.sh logs"
    echo "  • Check status:      ./start-infrasim.sh status"
    echo "  • Stop all:          ./start-infrasim.sh stop"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping InfraSim services...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ All services stopped${NC}"
}

# Function to restart services
restart_services() {
    echo -e "${YELLOW}🔄 Restarting InfraSim services...${NC}"
    stop_services
    start_services
}

# Function to show status
show_status() {
    echo -e "${BLUE}📊 InfraSim Services Status${NC}"
    echo "============================="
    docker-compose ps
    
    echo ""
    echo -e "${BLUE}🔗 Blockchain Status${NC}"
    echo "===================="
    
    # Check Hardhat status
    if curl -s -X POST -H "Content-Type: application/json" \
       --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
       http://localhost:8545 >/dev/null 2>&1; then
        BLOCK_NUMBER=$(curl -s -X POST -H "Content-Type: application/json" \
                      --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                      http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
        echo "• Hardhat Block Number: $((16#${BLOCK_NUMBER#0x}))"
        
        # Check network configuration
        CHAIN_ID=$(curl -s -X POST -H "Content-Type: application/json" \
                  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
                  http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
        echo "• Chain ID: $((16#${CHAIN_ID#0x}))"
    else
        echo "• Hardhat: Not responding"
    fi
    
    # Check deployment API
    if curl -s http://localhost:8546/health >/dev/null 2>&1; then
        echo "• Deployment API: Ready"
    else
        echo "• Deployment API: Not responding"
    fi
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📜 InfraSim Services Logs${NC}"
    echo "=========================="
    docker-compose logs -f
}

# Function to clean up
clean_services() {
    echo -e "${YELLOW}🧹 Cleaning up InfraSim environment...${NC}"
    docker-compose down -v --remove-orphans
    docker system prune -f
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to build containers
build_services() {
    echo -e "${YELLOW}🔨 Building InfraSim containers...${NC}"
    docker-compose build --no-cache
    echo -e "${GREEN}✅ Build completed${NC}"
}

# Check for Docker
check_docker

# Parse command
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_services
        ;;
    build)
        build_services
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac