import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const provider = new ethers.JsonRpcProvider(rpcUrl);

export async function GET(
  request: NextRequest,
  { params }: { params: { txHash: string } }
) {
  try {
    const txHash = params.txHash;

    // Get transaction and receipt in parallel
    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash)
    ]);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Get block for timestamp
    const block = transaction.blockNumber ? await provider.getBlock(transaction.blockNumber) : null;

    const txData = {
      hash: transaction.hash,
      blockNumber: transaction.blockNumber,
      blockHash: transaction.blockHash,
      transactionIndex: transaction.index,
      from: transaction.from,
      to: transaction.to,
      value: transaction.value?.toString(),
      gasLimit: transaction.gasLimit?.toString(),
      gasPrice: transaction.gasPrice?.toString(),
      maxFeePerGas: transaction.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString(),
      nonce: transaction.nonce,
      data: transaction.data,
      type: transaction.type,
      chainId: transaction.chainId,
      accessList: transaction.accessList,
      
      // Receipt data
      status: receipt?.status,
      gasUsed: receipt?.gasUsed?.toString(),
      effectiveGasPrice: receipt?.gasPrice?.toString(),
      contractAddress: receipt?.contractAddress,
      logs: receipt?.logs?.map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        blockHash: log.blockHash,
        logIndex: log.index,
      })),
      logsBloom: receipt?.logsBloom,
      
      // Block info
      timestamp: block?.timestamp,
      confirmations: transaction.confirmations,
    };

    return NextResponse.json(txData);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}