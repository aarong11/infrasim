import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

interface SendTransactionRequest {
  to: string;
  amount: string;
  token: string;
  gasPrice: string;
  gasLimit: string;
  data?: string;
  memo?: string;
  transactionType: 'simple' | 'token' | 'custom';
}

// ERC20 ABI for token transfers
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Common token addresses (you can expand this list)
const TOKEN_ADDRESSES: Record<string, { address: string; decimals: number }> = {
  'USDC': { address: '0xA0b86a33E6441Cc5C43EdC8FED86b88C7Ff39b19', decimals: 6 },
  'USDT': { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  'DAI': { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  // Add more tokens as needed
};

export async function POST(request: NextRequest) {
  try {
    const body: SendTransactionRequest = await request.json();
    const { to, amount, token, gasPrice, gasLimit, data, memo, transactionType } = body;

    // Validate inputs
    if (!to || !ethers.isAddress(to)) {
      return NextResponse.json(
        { error: 'Invalid recipient address' },
        { status: 400 }
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!gasPrice || !gasLimit) {
      return NextResponse.json(
        { error: 'Gas price and limit are required' },
        { status: 400 }
      );
    }

    // Get private key from environment (in production, this would be from secure storage)
    const privateKey = process.env.WALLET_PRIVATE_KEY || process.env.DEMO_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Wallet private key not configured' },
        { status: 500 }
      );
    }

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
    );
    
    const wallet = new ethers.Wallet(privateKey, provider);

    let transaction: ethers.TransactionResponse;
    let txHash: string;

    try {
      if (transactionType === 'simple' && token === 'ETH') {
        // Simple ETH transfer
        const amountWei = ethers.parseEther(amount);
        
        const txParams: ethers.TransactionRequest = {
          to: to,
          value: amountWei,
          gasPrice: ethers.parseUnits(gasPrice, 'gwei'),
          gasLimit: BigInt(gasLimit),
        };

        // Add memo as data if provided
        if (memo) {
          txParams.data = ethers.hexlify(ethers.toUtf8Bytes(memo));
        }

        transaction = await wallet.sendTransaction(txParams);
        txHash = transaction.hash;

      } else if (transactionType === 'token' || (transactionType === 'simple' && token !== 'ETH')) {
        // ERC20 Token transfer
        const tokenInfo = TOKEN_ADDRESSES[token];
        if (!tokenInfo) {
          return NextResponse.json(
            { error: `Unsupported token: ${token}` },
            { status: 400 }
          );
        }

        const tokenContract = new ethers.Contract(tokenInfo.address, ERC20_ABI, wallet);
        const amountWei = ethers.parseUnits(amount, tokenInfo.decimals);
        
        transaction = await tokenContract.transfer(to, amountWei, {
          gasPrice: ethers.parseUnits(gasPrice, 'gwei'),
          gasLimit: BigInt(gasLimit)
        });
        
        txHash = transaction.hash;

      } else if (transactionType === 'custom') {
        // Custom transaction with arbitrary data
        const txParams: ethers.TransactionRequest = {
          to: to,
          value: amount ? ethers.parseEther(amount) : 0n,
          gasPrice: ethers.parseUnits(gasPrice, 'gwei'),
          gasLimit: BigInt(gasLimit),
        };

        // Add custom data if provided
        if (data && data.startsWith('0x')) {
          txParams.data = data;
        } else if (data) {
          txParams.data = '0x' + data;
        }

        transaction = await wallet.sendTransaction(txParams);
        txHash = transaction.hash;

      } else {
        return NextResponse.json(
          { error: 'Invalid transaction type' },
          { status: 400 }
        );
      }

      // Log transaction details
      console.log('Transaction sent:', {
        hash: txHash,
        from: wallet.address,
        to,
        amount,
        token,
        type: transactionType,
        gasPrice,
        gasLimit,
        memo,
        timestamp: Date.now()
      });

      // Return transaction details
      return NextResponse.json({
        success: true,
        txHash,
        from: wallet.address,
        to,
        amount,
        token,
        transactionType,
        gasPrice,
        gasLimit,
        memo,
        blockNumber: transaction.blockNumber,
        nonce: transaction.nonce,
        timestamp: Date.now(),
        explorerUrl: `/explorer/tx/${txHash}`
      });

    } catch (txError) {
      console.error('Transaction execution error:', txError);
      
      let errorMessage = 'Transaction failed';
      if (txError instanceof Error) {
        errorMessage = txError.message;
      }
      
      // Handle specific error types
      if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction and gas';
      } else if (errorMessage.includes('gas')) {
        errorMessage = 'Gas estimation failed - please adjust gas settings';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'Transaction nonce error - please try again';
      } else if (errorMessage.includes('revert')) {
        errorMessage = 'Transaction would revert - check contract conditions';
      }

      return NextResponse.json(
        { error: errorMessage, details: txError instanceof Error ? txError.message : 'Unknown error' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Send transaction API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}