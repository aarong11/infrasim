import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Basic ERC20 ABI for token metadata
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenAddress: string } }
) {
  try {
    const tokenAddress = params.tokenAddress;

    // Validate address format
    if (!ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    // Check if it's a contract
    const code = await provider.getCode(tokenAddress);
    if (code === '0x') {
      return NextResponse.json(
        { error: 'Address is not a contract' },
        { status: 400 }
      );
    }

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    try {
      // Get basic token metadata
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name().catch(() => 'Unknown'),
        contract.symbol().catch(() => 'UNKNOWN'),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => '0')
      ]);

      // Get recent transfer events by scanning recent blocks
      const latestBlock = await provider.getBlockNumber();
      const blocksToScan = Math.min(1000, latestBlock);
      const transfers: any[] = [];
      const holders = new Map<string, string>();

      // Scan for Transfer events
      for (let i = latestBlock; i > latestBlock - blocksToScan && i >= 0; i--) {
        try {
          const block = await provider.getBlock(i, true);
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              // tx is a transaction hash string when getBlock is called with includeTransactions=true
              if (typeof tx === 'string') {
                const transaction = await provider.getTransaction(tx);
                if (transaction && transaction.to === tokenAddress) {
                  const receipt = await provider.getTransactionReceipt(transaction.hash);
                  if (receipt?.logs) {
                    for (const log of receipt.logs) {
                      if (log.address.toLowerCase() === tokenAddress.toLowerCase() && 
                          log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
                        
                        const from = ethers.getAddress('0x' + log.topics[1].slice(26));
                        const to = ethers.getAddress('0x' + log.topics[2].slice(26));
                        const value = ethers.getBigInt(log.data);
                        transfers.push({
                          from,
                          to,
                          value: value.toString(),
                          valueFormatted: ethers.formatUnits(value, decimals),
                          blockNumber: log.blockNumber,
                          transactionHash: log.transactionHash,
                          timestamp: block.timestamp,
                        });
                        // Track holder balances (naive approach)
                        if (from !== ethers.ZeroAddress) {
                          const currentBalance = holders.get(from) || '0';
                          const newBalance = ethers.getBigInt(currentBalance) - value;
                          holders.set(from, newBalance.toString());
                        }
                        if (to !== ethers.ZeroAddress) {
                          const currentBalance = holders.get(to) || '0';
                          const newBalance = ethers.getBigInt(currentBalance) + value;
                          holders.set(to, newBalance.toString());
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (blockError) {
          console.warn(`Failed to scan block ${i}:`, blockError);
        }
      }

      // Sort transfers by block number descending
      transfers.sort((a, b) => b.blockNumber - a.blockNumber);

      // Get top holders (excluding zero balances)
      const topHolders = Array.from(holders.entries())
        .filter(([_, balance]) => ethers.getBigInt(balance) > 0)
        .sort(([_, a], [__, b]) => ethers.getBigInt(b) > ethers.getBigInt(a) ? 1 : -1)
        .slice(0, 20)
        .map(([address, balance]) => ({
          address,
          balance,
          balanceFormatted: ethers.formatUnits(balance, decimals),
          percentage: totalSupply !== '0' ? 
            (Number(ethers.getBigInt(balance) * 10000n / ethers.getBigInt(totalSupply)) / 100).toFixed(2) : '0'
        }));

      return NextResponse.json({
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        totalSupplyFormatted: ethers.formatUnits(totalSupply, decimals),
        transfers: transfers.slice(0, 50), // Limit to 50 recent transfers
        totalTransfers: transfers.length,
        holders: topHolders,
        holderCount: holders.size,
      });
    } catch (contractError) {
      return NextResponse.json(
        { error: 'Contract does not appear to be a valid ERC20 token' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching token data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token details' },
      { status: 500 }
    );
  }
}