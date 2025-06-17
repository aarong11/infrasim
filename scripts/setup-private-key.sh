#!/bin/bash

# InfraSim Ethereum Private Key Setup Script
# Generates a secure private key for contract deployment

set -e  # Exit on any error

echo "🔐 InfraSim Ethereum Private Key Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSL is required but not installed. Please install OpenSSL first.${NC}"
    exit 1
fi

# Function to generate a secure private key
generate_private_key() {
    # Generate 32 bytes (256 bits) of random data and convert to hex
    # This creates a valid Ethereum private key (no echo statements here)
    openssl rand -hex 32
}

# Function to derive public key and address from private key
get_ethereum_address() {
    local private_key=$1
    
    # Note: This requires additional tools (like ethereumjs-util) to get the actual address
    # For now, we'll just show the private key format is correct
    echo "0x$(echo $private_key | tr '[:lower:]' '[:upper:]')"
}

# Function to setup environment file
setup_env_file() {
    local private_key=$1
    local env_file="./ethereum/.env"
    local env_example="./ethereum/.env.example"
    
    echo -e "${BLUE}📝 Setting up environment file...${NC}"
    
    # Create .env from .env.example if it doesn't exist
    if [ ! -f "$env_file" ]; then
        if [ -f "$env_example" ]; then
            cp "$env_example" "$env_file"
            echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        else
            # Create a basic .env file
            cat > "$env_file" << EOF
# Ethereum Environment Configuration
# Generated on $(date)

# Private key for contract deployment (without 0x prefix)
PRIVATE_KEY=

# Network configuration
NETWORK=localhost
RPC_URL=http://localhost:8545
CHAIN_ID=31337

# Gas configuration (optional)
GAS_LIMIT=3000000
GAS_PRICE=20000000000

# Development mode settings
DEV_MODE=true
EOF
            echo -e "${GREEN}✅ Created new .env file${NC}"
        fi
    fi
    
    # Create a temporary file with the updated content
    local temp_file=$(mktemp)
    
    # Read the current .env file and replace the PRIVATE_KEY line
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ "$line" =~ ^PRIVATE_KEY= ]]; then
            # Output clean private key without any ANSI codes
            printf "PRIVATE_KEY=%s\n" "$private_key"
        else
            printf "%s\n" "$line"
        fi
    done < "$env_file" > "$temp_file"
    
    # Replace the original file with the updated content
    mv "$temp_file" "$env_file"
    
    echo -e "${GREEN}✅ Updated private key in $env_file${NC}"
}

# Function to setup Docker Compose environment
setup_docker_env() {
    local private_key=$1
    local docker_env_file=".env"
    
    echo -e "${BLUE}🐳 Setting up Docker environment...${NC}"
    
    # Check if .env exists at root level for Docker Compose
    if [ ! -f "$docker_env_file" ]; then
        # Create new file with clean output (no ANSI codes in file content)
        cat > "$docker_env_file" << EOF
# InfraSim Docker Environment Configuration
# Generated on $(date)

# Ethereum Private Key
ETHEREUM_PRIVATE_KEY=$private_key

# Node Environment
NODE_ENV=development

# Ollama Configuration
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_HOST=0.0.0.0

# API Keys (set these if you have them)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LAMBDA_LABS_API_KEY=

# Ethereum Configuration
ETHEREUM_RPC_URL=http://ethereum-sim:8545
EOF
        echo -e "${GREEN}✅ Created Docker .env file${NC}"
    else
        # Create a temporary file for safe updating
        local temp_file=$(mktemp)
        local key_found=false
        
        # Read the current .env file and replace or add the ETHEREUM_PRIVATE_KEY line
        while IFS= read -r line || [[ -n "$line" ]]; do
            if [[ "$line" =~ ^ETHEREUM_PRIVATE_KEY= ]]; then
                # Output clean private key without any ANSI codes
                printf "ETHEREUM_PRIVATE_KEY=%s\n" "$private_key"
                key_found=true
            else
                printf "%s\n" "$line"
            fi
        done < "$docker_env_file" > "$temp_file"
        
        # If the key wasn't found, add it
        if [ "$key_found" = false ]; then
            printf "ETHEREUM_PRIVATE_KEY=%s\n" "$private_key" >> "$temp_file"
        fi
        
        # Replace the original file with the updated content
        mv "$temp_file" "$docker_env_file"
        
        echo -e "${GREEN}✅ Updated Docker .env file${NC}"
    fi
}

# Function to secure the files
secure_env_files() {
    echo -e "${BLUE}🔒 Securing environment files...${NC}"
    
    # Set restrictive permissions on .env files
    [ -f "./ethereum/.env" ] && chmod 600 "./ethereum/.env"
    [ -f "./.env" ] && chmod 600 "./.env"
    
    echo -e "${GREEN}✅ Set restrictive permissions on .env files${NC}"
}

# Function to add to .gitignore
update_gitignore() {
    echo -e "${BLUE}📋 Updating .gitignore...${NC}"
    
    local gitignore_entries=(
        ".env"
        "ethereum/.env" 
        "*.key"
        "*.pem"
        ".private"
    )
    
    for entry in "${gitignore_entries[@]}"; do
        if [ -f ".gitignore" ]; then
            if ! grep -q "^$entry$" .gitignore; then
                echo "$entry" >> .gitignore
            fi
        else
            echo "$entry" > .gitignore
        fi
    done
    
    echo -e "${GREEN}✅ Updated .gitignore${NC}"
}

# Function to display summary
display_summary() {
    local private_key=$1
    local public_info=$2
    
    echo ""
    echo -e "${GREEN}🎉 Private Key Setup Complete!${NC}"
    echo "=================================="
    echo ""
    echo -e "${YELLOW}📋 Summary:${NC}"
    echo "• Private key generated and saved securely"
    echo "• Environment files configured"
    echo "• Files secured with proper permissions"
    echo "• .gitignore updated"
    echo ""
    echo -e "${YELLOW}🔑 Private Key (first 8 chars): ${private_key:0:8}...${NC}"
    echo -e "${YELLOW}📁 Saved to: ./ethereum/.env and ./.env${NC}"
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "1. Run: docker-compose up -d"
    echo "2. The Ethereum simulation will use your new private key"
    echo "3. Contracts will be deployed automatically"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT SECURITY NOTES:${NC}"
    echo "• Never share your private key"
    echo "• Never commit .env files to version control"
    echo "• This key is for development only"
    echo "• Use a different key for production"
    echo ""
}

# Main execution
main() {
    # Check if we're in the right directory
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "${RED}❌ Please run this script from the InfraSim root directory${NC}"
        exit 1
    fi
    
    # Ask for confirmation
    echo -e "${YELLOW}This will generate a new private key and update environment files.${NC}"
    echo -e "${YELLOW}Any existing private key will be replaced.${NC}"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Operation cancelled.${NC}"
        exit 0
    fi
    
    # Generate the private key (this should output only the hex string)
    echo -e "${BLUE}🔑 Generating secure private key...${NC}"
    PRIVATE_KEY=$(generate_private_key)
    
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}❌ Failed to generate private key${NC}"
        exit 1
    fi
    
    # Validate the private key format (should be 64 hex characters)
    if ! [[ "$PRIVATE_KEY" =~ ^[a-f0-9]{64}$ ]]; then
        echo -e "${RED}❌ Generated private key has invalid format: ${PRIVATE_KEY}${NC}"
        exit 1
    fi
    
    # Setup environment files
    setup_env_file "$PRIVATE_KEY"
    setup_docker_env "$PRIVATE_KEY"
    
    # Secure the files
    secure_env_files
    
    # Update .gitignore
    update_gitignore
    
    # Display summary
    display_summary "$PRIVATE_KEY"
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi