import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const provider = new ethers.JsonRpcProvider(rpcUrl);

export async function GET(
  request: NextRequest,
  { params }: { params: { blockNumber: string } }
) {
  try {
    const blockNumber = params.blockNumber;
    
    // Handle both numeric and hash inputs
    const block = await provider.getBlock(
      blockNumber.startsWith('0x') ? blockNumber : parseInt(blockNumber),
      true // Include full transaction objects
    );

    if (!block) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      );
    }

    // Get transaction receipts for gas information
    const transactionsWithReceipts = await Promise.all(
      block.transactions.map(async (tx: any) => {
        try {
          const receipt = await provider.getTransactionReceipt(tx.hash);
          return {
            ...tx,
            gasUsed: receipt?.gasUsed?.toString(),
            status: receipt?.status,
            contractAddress: receipt?.contractAddress,
            logs: receipt?.logs,
          };
        } catch (error) {
          console.warn(`Failed to get receipt for tx ${tx.hash}:`, error);
          return tx;
        }
      })
    );

    const blockData = {
      number: block.number,
      hash: block.hash,
      timestamp: block.timestamp,
      gasUsed: block.gasUsed?.toString(),
      gasLimit: block.gasLimit?.toString(),
      baseFeePerGas: block.baseFeePerGas?.toString(),
      miner: block.miner,
      difficulty: block.difficulty?.toString(),
      totalDifficulty: block.difficulty?.toString(),
      size: block.length || 0,
      parentHash: block.parentHash,
      nonce: block.nonce,
      extraData: block.extraData,
      transactions: transactionsWithReceipts,
      transactionCount: block.transactions.length,
    };

    return NextResponse.json(blockData);
  } catch (error) {
    console.error('Error fetching block:', error);
    return NextResponse.json(
      { error: 'Failed to fetch block details' },
      { status: 500 }
    );
  }
}