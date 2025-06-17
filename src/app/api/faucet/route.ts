import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

interface FaucetRequest {
  address: string;
  amount?: string;
  token?: 'ETH' | 'USDC';
}

interface FaucetResponse {
  success: boolean;
  message: string;
  transactionHash?: string;
  amount?: string;
  token?: string;
  balance?: string;
}

// Faucet configuration
const FAUCET_CONFIG = {
  ETH: {
    amount: '1.0', // 1 ETH
    decimals: 18,
    symbol: 'ETH'
  },
  USDC: {
    amount: '1000', // 1000 USDC
    decimals: 6,
    symbol: 'USDC',
    contractAddress: process.env.USDC_CONTRACT_ADDRESS
  }
};

// Rate limiting (simple in-memory store)
const lastClaims = new Map<string, number>();
const CLAIM_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function POST(request: NextRequest) {
  try {
    const body: FaucetRequest = await request.json();
    const { address, amount, token = 'ETH' } = body;

    // Validate address
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid Ethereum address'
      } as FaucetResponse, { status: 400 });
    }

    // Check rate limiting
    const now = Date.now();
    const lastClaim = lastClaims.get(address.toLowerCase());
    if (lastClaim && (now - lastClaim) < CLAIM_COOLDOWN) {
      const timeLeft = Math.ceil((CLAIM_COOLDOWN - (now - lastClaim)) / (60 * 60 * 1000));
      return NextResponse.json({
        success: false,
        message: `Please wait ${timeLeft} hours before claiming again`
      } as FaucetResponse, { status: 429 });
    }

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
    );

    // Get faucet wallet (use deployer account for simplicity)
    const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY || 
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat account
    const faucetWallet = new ethers.Wallet(faucetPrivateKey, provider);

    let transactionHash: string;
    let sentAmount: string;
    let tokenSymbol: string;

    if (token === 'ETH') {
      // Send ETH
      const ethAmount = amount || FAUCET_CONFIG.ETH.amount;
      const tx = await faucetWallet.sendTransaction({
        to: address,
        value: ethers.parseEther(ethAmount),
        gasLimit: 21000
      });
      
      await tx.wait();
      transactionHash = tx.hash;
      sentAmount = ethAmount;
      tokenSymbol = 'ETH';

    } else if (token === 'USDC') {
      // Send USDC tokens
      const usdcAmount = amount || FAUCET_CONFIG.USDC.amount;
      
      // Load deployed contract info
      let usdcAddress: string;
      try {
        const fs = require('fs');
        const deployedPath = '/app/ethereum/data/deployed.json';
        if (fs.existsSync(deployedPath)) {
          const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
          usdcAddress = deployed.contracts.USDC.address;
        } else {
          throw new Error('Deployed contracts not found');
        }
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'USDC contract not deployed. Please deploy contracts first.'
        } as FaucetResponse, { status: 500 });
      }

      // USDC contract ABI (minimal)
      const usdcAbi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, faucetWallet);
      
      // Check faucet balance
      const faucetBalance = await usdcContract.balanceOf(faucetWallet.address);
      const requiredAmount = ethers.parseUnits(usdcAmount, FAUCET_CONFIG.USDC.decimals);
      
      if (faucetBalance < requiredAmount) {
        return NextResponse.json({
          success: false,
          message: 'Faucet has insufficient USDC balance'
        } as FaucetResponse, { status: 500 });
      }

      // Send USDC
      const tx = await usdcContract.transfer(address, requiredAmount);
      await tx.wait();
      
      transactionHash = tx.hash;
      sentAmount = usdcAmount;
      tokenSymbol = 'USDC';
    } else {
      return NextResponse.json({
        success: false,
        message: 'Unsupported token. Use ETH or USDC.'
      } as FaucetResponse, { status: 400 });
    }

    // Update rate limiting
    lastClaims.set(address.toLowerCase(), now);

    // Get updated balance
    let balance: string;
    if (token === 'ETH') {
      const ethBalance = await provider.getBalance(address);
      balance = ethers.formatEther(ethBalance);
    } else {
      const usdcAddress = JSON.parse(require('fs').readFileSync('/app/ethereum/data/deployed.json', 'utf8')).contracts.USDC.address;
      const usdcContract = new ethers.Contract(usdcAddress, ['function balanceOf(address) view returns (uint256)'], provider);
      const usdcBalance = await usdcContract.balanceOf(address);
      balance = ethers.formatUnits(usdcBalance, FAUCET_CONFIG.USDC.decimals);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${sentAmount} ${tokenSymbol} to ${address}`,
      transactionHash,
      amount: sentAmount,
      token: tokenSymbol,
      balance: `${balance} ${tokenSymbol}`
    } as FaucetResponse);

  } catch (error: any) {
    console.error('Faucet error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to process faucet request'
    } as FaucetResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Get faucet status and configuration
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    let balanceInfo = {};
    
    if (address && ethers.isAddress(address)) {
      const provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
      );

      // Get ETH balance
      const ethBalance = await provider.getBalance(address);
      balanceInfo = {
        ...balanceInfo,
        ethBalance: ethers.formatEther(ethBalance)
      };

      // Get USDC balance if contract is deployed
      try {
        const fs = require('fs');
        const deployedPath = '/app/ethereum/data/deployed.json';
        if (fs.existsSync(deployedPath)) {
          const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
          const usdcAddress = deployed.contracts.USDC.address;
          const usdcContract = new ethers.Contract(
            usdcAddress, 
            ['function balanceOf(address) view returns (uint256)'], 
            provider
          );
          const usdcBalance = await usdcContract.balanceOf(address);
          balanceInfo = {
            ...balanceInfo,
            usdcBalance: ethers.formatUnits(usdcBalance, 6)
          };
        }
      } catch (error) {
        // USDC contract not available
      }

      // Check rate limiting
      const lastClaim = lastClaims.get(address.toLowerCase());
      const now = Date.now();
      const canClaim = !lastClaim || (now - lastClaim) >= CLAIM_COOLDOWN;
      const timeLeft = lastClaim ? Math.max(0, Math.ceil((CLAIM_COOLDOWN - (now - lastClaim)) / (60 * 60 * 1000))) : 0;

      balanceInfo = {
        ...balanceInfo,
        canClaim,
        timeLeft
      };
    }

    return NextResponse.json({
      success: true,
      config: {
        ethAmount: FAUCET_CONFIG.ETH.amount,
        usdcAmount: FAUCET_CONFIG.USDC.amount,
        cooldownHours: CLAIM_COOLDOWN / (60 * 60 * 1000)
      },
      ...balanceInfo
    });

  } catch (error: any) {
    console.error('Faucet status error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get faucet status'
    }, { status: 500 });
  }
}