import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { nonceStore } from '../../../../lib/wallet-auth/nonce-store';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/wallet-auth/request-nonce
 * Request a nonce for wallet signature authentication
 */
export async function POST(request: NextRequest) {
  try {
    const { wallet } = await request.json();

    // Validate wallet address
    if (!wallet || !ethers.isAddress(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Generate a random 6-digit nonce
    const nonce = crypto.randomInt(100000, 999999).toString();
    
    // Set expiration to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    // Store nonce (overwrites any existing nonce for this wallet)
    nonceStore.set(wallet, nonce, expiresAt);

    console.log(`Generated nonce for wallet ${wallet}: ${nonce}`);

    return NextResponse.json({ nonce });

  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}