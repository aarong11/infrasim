#!/bin/bash

# InfraSim Development Starter Script
# Provides options for different development modes

set -e

echo "🚀 InfraSim Development Environment"
echo "==================================="

# Function to display menu
show_menu() {
    echo ""
    echo "Select development mode:"
    echo "1) Hot Reload Mode (recommended) - Changes reflect instantly"
    echo "2) Auto-rebuild Mode - Container rebuilds on file changes"
    echo "3) Production Mode - Full rebuild required for changes"
    echo "4) Stop all containers"
    echo "5) Clean rebuild (remove containers and images)"
    echo ""
    read -p "Enter your choice (1-5): " choice
}

# Function for hot reload mode
start_hot_reload() {
    echo "🔥 Starting in Hot Reload Mode..."
    echo "Your source code is mounted as volumes - changes will be reflected immediately!"
    docker-compose -f docker-compose.yml up --build
}

# Function for auto-rebuild mode (requires Docker Compose 2.22+)
start_auto_rebuild() {
    echo "🔄 Starting in Auto-rebuild Mode..."
    echo "Container will rebuild automatically when dependencies change."
    if command -v docker compose &> /dev/null; then
        docker compose -f docker-compose.dev.yml watch
    else
        echo "⚠️  Docker Compose watch requires version 2.22+. Falling back to hot reload mode..."
        start_hot_reload
    fi
}

# Function for production mode
start_production() {
    echo "🏭 Starting in Production Mode..."
    docker-compose -f docker-compose.yml up --build --target production
}

# Function to stop containers
stop_containers() {
    echo "🛑 Stopping all containers..."
    docker-compose -f docker-compose.yml down
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
}

# Function for clean rebuild
clean_rebuild() {
    echo "🧹 Performing clean rebuild..."
    read -p "This will remove all containers and images. Continue? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        docker-compose -f docker-compose.yml down --rmi all --volumes --remove-orphans
        docker-compose -f docker-compose.dev.yml down --rmi all --volumes --remove-orphans 2>/dev/null || true
        docker system prune -f
        echo "✅ Clean rebuild complete. You can now start with any mode."
    else
        echo "❌ Clean rebuild cancelled."
    fi
}

# Main script logic
show_menu

case $choice in
    1)
        start_hot_reload
        ;;
    2)
        start_auto_rebuild
        ;;
    3)
        start_production
        ;;
    4)
        stop_containers
        ;;
    5)
        clean_rebuild
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac