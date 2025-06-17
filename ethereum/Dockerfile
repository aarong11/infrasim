FROM node:20

# Install additional utilities for state management
RUN apt-get update && apt-get install -y jq curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies first (for better Docker layer caching)
COPY package*.json ./
RUN npm install

# Copy configuration files
COPY hardhat.config.js ./

# Copy contracts directory
COPY contracts/ ./contracts/

# Copy scripts directory
COPY scripts/ ./scripts/

# Copy entrypoint script
COPY entrypoint.sh ./

# Copy any remaining files
COPY . .

# Compile contracts
RUN npx hardhat compile

# Create data directory structure for persistence
RUN mkdir -p /data/blockchain /data/accounts

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Expose Hardhat node port and deployment API port
EXPOSE 8545 8546

# Use entrypoint script
ENTRYPOINT ["./entrypoint.sh"]