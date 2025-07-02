import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Get provider from environment or use default local node
const getProvider = () => {
  const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Create a server-side wallet for faucet distributions
const createFaucetWallet = () => {
  const privateKey = process.env.ETHEREUM_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  return {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Default Hardhat account
    privateKey
  };
};

export async function POST(request: NextRequest) {
  try {
    const { address, amount } = await request.json();
    
    // Validate address
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address'
      }, { status: 400 });
    }

    // Validate amount (default to 1 ETH if not specified)
    const ethAmount = amount || '1.0';
    const parsedAmount = parseFloat(ethAmount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be between 0.1 and 10 ETH'
      }, { status: 400 });
    }

    const provider = getProvider();
    const faucetWallet = createFaucetWallet();
    
    // Create wallet instance with provider
    const wallet = new ethers.Wallet(faucetWallet.privateKey, provider);
    
    // Check faucet balance
    const faucetBalance = await provider.getBalance(faucetWallet.address);
    const requiredAmount = ethers.parseEther(ethAmount);
    
    if (faucetBalance < requiredAmount) {
      return NextResponse.json({
        success: false,
        error: 'Faucet has insufficient funds'
      }, { status: 503 });
    }

    // Send ETH to the requested address
    const transaction = await wallet.sendTransaction({
      to: address,
      value: requiredAmount,
      gasLimit: 21000 // Standard ETH transfer gas limit
    });

    // Wait for transaction confirmation
    await transaction.wait();

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${ethAmount} ETH to ${address}`,
      transactionHash: transaction.hash,
      amount: ethAmount,
      recipient: address
    });

  } catch (error) {
    console.error('Faucet error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process faucet request'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const provider = getProvider();
    const faucetWallet = createFaucetWallet();
    
    // Get faucet status
    const balance = await provider.getBalance(faucetWallet.address);
    const balanceEth = ethers.formatEther(balance);
    
    return NextResponse.json({
      success: true,
      faucet: {
        address: faucetWallet.address,
        balance: balanceEth,
        available: parseFloat(balanceEth) > 0,
        maxAmount: '10.0',
        defaultAmount: '1.0'
      }
    });
    
  } catch (error) {
    console.error('Faucet status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get faucet status'
    }, { status: 500 });
  }
}