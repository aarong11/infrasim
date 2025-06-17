import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Get provider from environment or use default local node
const getProvider = () => {
  const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const provider = getProvider();
    
    // Get latest block number
    const latestBlockNumber = await provider.getBlockNumber();
    
    // Calculate which blocks to fetch transactions from
    const startBlock = Math.max(0, latestBlockNumber - offset);
    const endBlock = Math.max(0, startBlock - limit + 1);
    
    const transactions = [];
    let totalCount = 0;
    
    // Fetch transactions from recent blocks
    for (let blockNum = startBlock; blockNum >= endBlock && blockNum >= 0; blockNum--) {
      try {
        const block = await provider.getBlock(blockNum, true);
        if (block && block.transactions) {
          // Add block timestamp and number to each transaction
          for (const tx of block.transactions) {
            if (tx && typeof tx === 'object') {
              const transaction = tx as any; // Type assertion to work around ethers typing issues
              if (transaction.hash) {
                transactions.push({
                  hash: transaction.hash,
                  blockNumber: block.number,
                  blockHash: block.hash,
                  from: transaction.from,
                  to: transaction.to,
                  value: transaction.value.toString(),
                  gasPrice: transaction.gasPrice?.toString() || '0',
                  gasLimit: transaction.gasLimit.toString(),
                  nonce: transaction.nonce,
                  timestamp: block.timestamp,
                  transactionIndex: transaction.index,
                  type: transaction.type || 0,
                  status: 1 // Assume successful for now, could fetch receipt for actual status
                });
                totalCount++;
              }
            }
          }
        }
      } catch (blockError) {
        console.warn(`Failed to fetch block ${blockNum}:`, blockError);
        continue;
      }
    }
    
    // Sort by block number and transaction index (newest first)
    transactions.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return b.blockNumber - a.blockNumber;
      }
      return b.transactionIndex - a.transactionIndex;
    });
    
    // Limit results
    const paginatedTxs = transactions.slice(0, limit);
    
    return NextResponse.json({
      transactions: paginatedTxs,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: startBlock > endBlock && endBlock > 0
      },
      latestBlock: latestBlockNumber
    });
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}