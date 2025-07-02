import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Get gas price estimates
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you'd connect to your Ethereum provider
    // For now, returning reasonable estimates
    const gasPrice = '20'; // 20 Gwei
    const estimatedGas = '21000'; // Standard ETH transfer

    return NextResponse.json({
      success: true,
      gasPrice,
      estimatedGas,
      gasPriceGwei: gasPrice,
      // Different speed options
      slow: '15',
      standard: '20', 
      fast: '35',
      rapid: '50'
    });
  } catch (error) {
    console.error('Error estimating gas:', error);
    return NextResponse.json(
      { error: 'Failed to estimate gas' },
      { status: 500 }
    );
  }
}