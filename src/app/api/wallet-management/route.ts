import { NextRequest, NextResponse } from 'next/server';
import { withAuth, MiddlewarePresets, AuthenticatedRequest, getWalletAddress, AuthAPIResponse } from '../../../lib/middleware/auth-utils';
import { getWalletUsageStats, addWalletDeposit } from '../../../lib/middleware/auth-middleware';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/wallet-management/stats
 * Get wallet usage statistics and billing information
 */
export const GET = withAuth(MiddlewarePresets.basicAuth(), async (request: AuthenticatedRequest) => {
  try {
    const walletAddress = getWalletAddress(request);
    const stats = getWalletUsageStats(walletAddress);
    
    return AuthAPIResponse.success({
      walletAddress,
      usage: stats,
      endpoints: {
        deposit: '/api/wallet-management/deposit',
        usage: '/api/wallet-management/stats',
      },
    });
  } catch (error) {
    console.error('Error getting wallet stats:', error);
    return AuthAPIResponse.error('Failed to get wallet statistics', 'STATS_ERROR', 500);
  }
});

/**
 * POST /api/wallet-management/deposit
 * Add deposit to wallet balance (simulated - in production this would be handled by smart contract)
 */
export const POST = withAuth(MiddlewarePresets.basicAuth(), async (request: AuthenticatedRequest) => {
  try {
    const { amount } = await request.json();
    const walletAddress = getWalletAddress(request);
    
    if (!amount || isNaN(parseFloat(amount))) {
      return AuthAPIResponse.error('Invalid deposit amount', 'INVALID_AMOUNT', 400);
    }
    
    // Convert to wei if amount is in ETH
    const amountInWei = amount.toString().includes('.') 
      ? (parseFloat(amount) * 1e18).toString()
      : amount;
    
    await addWalletDeposit(walletAddress, amountInWei);
    
    const updatedStats = getWalletUsageStats(walletAddress);
    
    return AuthAPIResponse.success({
      message: `Successfully deposited ${amount} ETH to wallet`,
      walletAddress,
      newBalance: updatedStats.billing?.balance || '0',
      depositAmount: amount,
    });
    
  } catch (error) {
    console.error('Error processing deposit:', error);
    return AuthAPIResponse.error('Failed to process deposit', 'DEPOSIT_ERROR', 500);
  }
});