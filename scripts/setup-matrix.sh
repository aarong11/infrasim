#!/bin/bash

# Matrix Synapse Setup Script for InfraSim
set -e

echo "🚀 Setting up Matrix Synapse server..."

# Wait for Matrix server to be ready
echo "⏳ Waiting for Matrix server to start..."
until curl -f http://localhost:8008/_matrix/client/versions >/dev/null 2>&1; do
    echo "Waiting for Matrix server..."
    sleep 5
done

echo "✅ Matrix server is ready!"

# Create admin user
echo "👤 Creating admin user..."
docker exec infrasim-matrix register_new_matrix_user \
    -u admin \
    -p infrasim_admin \
    -a \
    -c /data/homeserver.yaml \
    http://localhost:8008 || echo "Admin user might already exist"

# Create demo users
echo "👥 Creating demo users..."
docker exec infrasim-matrix register_new_matrix_user \
    -u alice \
    -p alice123 \
    -c /data/homeserver.yaml \
    http://localhost:8008 || echo "Alice user might already exist"

docker exec infrasim-matrix register_new_matrix_user \
    -u bob \
    -p bob123 \
    -c /data/homeserver.yaml \
    http://localhost:8008 || echo "Bob user might already exist"

echo "📋 Matrix setup complete!"
echo ""
echo "🌐 Matrix Server: http://localhost:8008"
echo "🔧 Matrix Admin: http://localhost:8080"
echo "💬 Element Web Client: https://app.element.io"
echo ""
echo "👤 Admin credentials:"
echo "   Username: admin"
echo "   Password: infrasim_admin"
echo ""
echo "👥 Demo user credentials:"
echo "   Alice: alice / alice123"
echo "   Bob: bob / bob123"
echo ""
echo "🏠 Server name: localhost"
echo "📡 Homeserver URL: http://localhost:8008"