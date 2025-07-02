#!/bin/bash

# Geth initialization script for Polygon testnet
echo "🚀 Initializing Geth Polygon Testnet Node..."

# Set data directory
DATADIR="/root/.ethereum"

# Initialize the blockchain if not already done
if [ ! -d "$DATADIR/geth" ]; then
    echo "📄 Initializing blockchain with genesis block..."
    geth --datadir="$DATADIR" init /genesis.json
    
    # Create keystore directory
    mkdir -p "$DATADIR/keystore"
    
    # Import pre-funded accounts (Hardhat default accounts)
    echo "🔑 Creating pre-funded accounts..."
    
    # Account 1: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Default miner/validator)
    echo '{"address":"f39fd6e51aad88f6f4ce6ab8827279cfffb92266","crypto":{"cipher":"aes-128-ctr","ciphertext":"4e77046ba3f699e744acb4a89c36a3ea1158a1bd90a076d36675f4c883864377","cipherparams":{"iv":"a8932af2a3c0225ee094d0906f766a1e"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"8ca49552b3e92f79c51f2cd043d0f7dd9de0712635e8fca74d0b05e5b58c22f4"},"mac":"6d913b55af9313c706d50ea06638a3b51dbd30ab69ef11cd0c6d3e5655c18966"},"id":"9b9db5c0-7b72-4005-b9c8-6f24b8b78716","version":3}' > "$DATADIR/keystore/UTC--2023-01-01T00-00-00.000000000Z--f39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    
    echo "✅ Blockchain initialized successfully!"
else
    echo "✅ Using existing blockchain data"
fi

# Create password file for the primary account
echo "password" > /tmp/password

# Start Geth with Polygon-like configuration
echo "🌐 Starting Geth node..."
exec geth \
    --datadir="$DATADIR" \
    --networkid="${NETWORK_ID:-1337}" \
    --http \
    --http.addr="0.0.0.0" \
    --http.port=8545 \
    --http.api="admin,debug,web3,eth,txpool,personal,clique,miner,net" \
    --http.corsdomain="*" \
    --http.vhosts="*" \
    --ws \
    --ws.addr="0.0.0.0" \
    --ws.port=8546 \
    --ws.api="admin,debug,web3,eth,txpool,personal,clique,miner,net" \
    --ws.origins="*" \
    --port=30303 \
    --mine \
    --miner.etherbase="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
    --unlock="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
    --password=/tmp/password \
    --allow-insecure-unlock \
    --nodiscover \
    --maxpeers=0 \
    --verbosity=3 \
    --gcmode=archive \
    --syncmode=full