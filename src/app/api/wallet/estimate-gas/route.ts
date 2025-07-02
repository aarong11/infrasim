import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

interface GasEstimationRequest {
  to: string;
  amount: string;
  token: string;
  data?: string;
  transactionType: 'simple' | 'token' | 'custom';
}

export async function POST(request: NextRequest) {
  try {
    const body: GasEstimationRequest = await request.json();
    const { to, amount, token, data, transactionType } = body;

    // Validate inputs
    if (!to || !ethers.isAddress(to)) {
      return NextResponse.json(
        { error: 'Invalid recipient address' },
        { status: 400 }
      );
    }

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
    );

    let gasLimit = '21000'; // Default for ETH transfer
    let gasPrice = '20'; // Default 20 Gwei

    try {
      // Get current gas price from network
      const feeData = await provider.getFeeData();
      if (feeData.gasPrice) {
        gasPrice = ethers.formatUnits(feeData.gasPrice, 'gwei');
      }
    } catch (error) {
      console.warn('Failed to get network gas price, using default');
    }

    // Estimate gas based on transaction type
    if (transactionType === 'simple' && token === 'ETH') {
      // Simple ETH transfer
      gasLimit = '21000';
    } else if (transactionType === 'token' || (transactionType === 'simple' && token !== 'ETH')) {
      // ERC20 token transfer
      gasLimit = '65000'; // Higher gas limit for token transfers
    } else if (transactionType === 'custom') {
      // Custom transaction with data
      if (data && data.length > 2) {
        // Estimate based on data length
        const dataLength = (data.length - 2) / 2; // Remove 0x and convert to bytes
        const baseGas = 21000;
        const dataGas = dataLength * 16; // 16 gas per byte of data
        gasLimit = (baseGas + dataGas + 10000).toString(); // Add buffer
      } else {
        gasLimit = '21000';
      }
    }

    // Try to estimate gas more accurately if possible
    try {
      let estimateParams: any = {
        to,
        value: transactionType !== 'custom' && token === 'ETH' 
          ? ethers.parseEther(amount || '0')
          : 0n
      };

      if (data && transactionType === 'custom') {
        estimateParams.data = data;
      }

      const estimatedGas = await provider.estimateGas(estimateParams);
      gasLimit = estimatedGas.toString();
    } catch (error) {
      console.warn('Gas estimation failed, using default:', error);
    }

    // Provide different speed options
    const baseGasPrice = parseFloat(gasPrice);
    
    return NextResponse.json({
      success: true,
      gasPrice: Math.ceil(baseGasPrice).toString(), // Standard
      gasLimit,
      estimatedGas: gasLimit,
      gasPriceOptions: {
        slow: Math.ceil(baseGasPrice * 0.8).toString(),
        standard: Math.ceil(baseGasPrice).toString(),
        fast: Math.ceil(baseGasPrice * 1.5).toString(),
        rapid: Math.ceil(baseGasPrice * 2).toString()
      },
      totalGasCost: (parseFloat(gasLimit) * baseGasPrice / 1e9).toFixed(6) + ' ETH'
    });

  } catch (error) {
    console.error('Gas estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate gas' },
      { status: 500 }
    );
  }
}