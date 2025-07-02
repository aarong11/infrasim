#!/bin/bash

# Generate a secure JWT secret
generate_jwt_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check if .env file exists, if not copy from .env.example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env file from .env.example"
    else
        echo "Error: .env.example file not found"
        exit 1
    fi
fi

# Generate a new JWT secret
JWT_SECRET=$(generate_jwt_secret)

# Update or add JWT_SECRET to .env file
if grep -q "^JWT_SECRET=" .env; then
    # Replace existing JWT_SECRET
    sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    echo "Updated JWT_SECRET in .env file"
else
    # Add JWT_SECRET if it doesn't exist
    echo "JWT_SECRET=$JWT_SECRET" >> .env
    echo "Added JWT_SECRET to .env file"
fi

echo "JWT_SECRET has been set to: $JWT_SECRET"
echo ""
echo "Your wallet authentication system is now ready!"
echo ""
echo "API Endpoints:"
echo "  POST /api/wallet-auth/request-nonce"
echo "  POST /api/wallet-auth/verify-signature"