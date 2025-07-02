import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { JWTAuthService } from '@/services/jwt-auth-service';

interface SendTransactionRequest {
  to: string;
  amount: string;
  token: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    type: 'native' | 'erc20' | 'erc1155';
  };
  gasPrice: string;
  gasLimit: string;
  memo?: string;
}

// ERC20 ABI for token transfers
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ERC1155 ABI for NFT transfers
const ERC1155_ABI = [
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function balanceOf(address account, uint256 id) view returns (uint256)'
];

export async function POST(request: NextRequest) {
  try {
    const jwtService = JWTAuthService.getInstance();
    
    // Verify authentication
    if (!jwtService.isAuthenticated()) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: SendTransactionRequest = await request.json();
    const { to, amount, token, gasPrice, gasLimit, memo } = body;

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

    // Get wallet private key from JWT service
    const walletAddress = jwtService.getWalletAddress();
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 400 }
      );
    }

    // In a real implementation, you'd get the private key securely
    // For demo purposes, we'll simulate the transaction
    const mockPrivateKey = process.env.DEMO_PRIVATE_KEY || '0x' + '1'.repeat(64);
    
    // Connect to provider (using your existing setup)
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
    );
    
    const wallet = new ethers.Wallet(mockPrivateKey, provider);

    let transaction;
    let txHash;

    if (token.type === 'native') {
      // Send native ETH
      const amountWei = ethers.parseEther(amount);
      
      transaction = await wallet.sendTransaction({
        to: to,
        value: amountWei,
        gasPrice: ethers.parseUnits(gasPrice, 'gwei'),
        gasLimit: BigInt(gasLimit),
        data: memo ? ethers.hexlify(ethers.toUtf8Bytes(memo)) : '0x'
      });
      
      txHash = transaction.hash;
    } else if (token.type === 'erc20') {
      // Send ERC20 token
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet);
      const amountWei = ethers.parseUnits(amount, token.decimals);
      
      transaction = await tokenContract.transfer(to, amountWei, {
        gasPrice: ethers.parseUnits(gasPrice, 'gwei'),
        gasLimit: BigInt(gasLimit)
      });
      
      txHash = transaction.hash;
    } else if (token.type === 'erc1155') {
      // Send ERC1155 NFT
      const nftContract = new ethers.Contract(token.address, ERC1155_ABI, wallet);
      const tokenId = 1; // You'd determine this based on the specific NFT
      const transferAmount = parseInt(amount);
      
      transaction = await nftContract.safeTransferFrom(
        wallet.address,
        to,
        tokenId,
        transferAmount,
        '0x', // empty data
        {
          gasPrice: ethers.parseUnits(gasPrice, 'gwei'),
          gasLimit: BigInt(gasLimit)
        }
      );
      
      txHash = transaction.hash;
    } else {
      return NextResponse.json(
        { error: 'Unsupported token type' },
        { status: 400 }
      );
    }

    // Log transaction for history (you'd save this to your database)
    console.log('Transaction sent:', {
      from: wallet.address,
      to,
      amount,
      token: token.symbol,
      txHash,
      memo,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      txHash,
      from: wallet.address,
      to,
      amount,
      token: token.symbol,
      gasPrice,
      gasLimit,
      memo,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Transaction error:', error);
    
    let errorMessage = 'Transaction failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Handle specific error types
    if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for transaction';
    } else if (errorMessage.includes('gas')) {
      errorMessage = 'Gas estimation failed - please adjust gas settings';
    } else if (errorMessage.includes('nonce')) {
      errorMessage = 'Transaction nonce error - please try again';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}