import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const provider = new ethers.JsonRpcProvider(rpcUrl);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    const latestBlockNumber = await provider.getBlockNumber();
    const startBlock = Math.max(0, latestBlockNumber - ((page - 1) * limit) - limit + 1);
    const endBlock = Math.max(0, latestBlockNumber - ((page - 1) * limit));

    const blocks = [];
    for (let i = endBlock; i >= startBlock && blocks.length < limit; i--) {
      try {
        const block = await provider.getBlock(i, false);
        if (block) {
          blocks.push({
            number: block.number,
            hash: block.hash,
            timestamp: block.timestamp,
            gasUsed: block.gasUsed?.toString(),
            gasLimit: block.gasLimit?.toString(),
            miner: block.miner,
            transactions: block.transactions,
            transactionCount: block.transactions.length,
            size: block.length || 0,
            difficulty: block.difficulty?.toString(),
            parentHash: block.parentHash,
          });
        }
      } catch (blockError) {
        console.warn(`Failed to fetch block ${i}:`, blockError);
      }
    }

    return NextResponse.json({
      blocks,
      totalBlocks: latestBlockNumber + 1,
      currentPage: page,
      totalPages: Math.ceil((latestBlockNumber + 1) / limit),
    });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocks' },
      { status: 500 }
    );
  }
}