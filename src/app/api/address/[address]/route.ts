import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const provider = new ethers.JsonRpcProvider(rpcUrl);

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validate address format
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Get balance and nonce
    const [balance, nonce, code] = await Promise.all([
      provider.getBalance(address),
      provider.getTransactionCount(address),
      provider.getCode(address)
    ]);

    const isContract = code !== '0x';

    // Get recent transactions by scanning recent blocks
    const latestBlock = await provider.getBlockNumber();
    const blocksToScan = Math.min(1000, latestBlock); // Scan last 1000 blocks or all if less
    const transactions: any[] = [];

    for (let i = latestBlock; i > latestBlock - blocksToScan && i >= 0; i--) {
      try {
        const block = await provider.getBlock(i, true);
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            // tx is a transaction hash string when getBlock is called with includeTransactions=true
            if (typeof tx === 'string') {
              const transaction = await provider.getTransaction(tx);
              if (transaction && transaction.from && transaction.to && 
                  (transaction.from === address || transaction.to === address)) {
                const receipt = await provider.getTransactionReceipt(transaction.hash);
                transactions.push({
                  hash: transaction.hash,
                  blockNumber: transaction.blockNumber,
                  from: transaction.from,
                  to: transaction.to,
                  value: transaction.value?.toString(),
                  gasUsed: receipt?.gasUsed?.toString(),
                  gasPrice: transaction.gasPrice?.toString(),
                  status: receipt?.status,
                  timestamp: block.timestamp,
                  type: transaction.from === address ? 'outgoing' : 'incoming',
                });
              }
            }
          }
        }
      } catch (blockError) {
        console.warn(`Failed to fetch block ${i}:`, blockError);
      }
    }

    // Sort by block number descending and paginate
    transactions.sort((a, b) => b.blockNumber - a.blockNumber);
    const startIndex = (page - 1) * limit;
    const paginatedTxs = transactions.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      address,
      balance: balance.toString(),
      balanceEth: ethers.formatEther(balance),
      nonce,
      isContract,
      code: isContract ? code : undefined,
      transactions: paginatedTxs,
      totalTransactions: transactions.length,
      currentPage: page,
      totalPages: Math.ceil(transactions.length / limit),
    });
  } catch (error) {
    console.error('Error fetching address data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch address details' },
      { status: 500 }
    );
  }
}