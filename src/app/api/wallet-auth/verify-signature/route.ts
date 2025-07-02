import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { nonceStore } from '../../../../lib/wallet-auth/nonce-store';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/wallet-auth/verify-signature
 * Verify wallet signature and issue JWT token
 */
export async function POST(request: NextRequest) {
  try {
    const { wallet, signature } = await request.json();

    // Validate inputs
    if (!wallet || !ethers.isAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Signature is required' },
        { status: 400 }
      );
    }

    // Get nonce for this wallet
    const storedData = nonceStore.get(wallet);

    if (!storedData) {
      return NextResponse.json(
        { success: false, error: 'No nonce found for this wallet. Please request a new nonce.' },
        { status: 400 }
      );
    }

    // Check if nonce is expired
    const now = new Date();
    if (storedData.expiresAt < now) {
      nonceStore.delete(wallet);
      return NextResponse.json(
        { success: false, error: 'Nonce has expired. Please request a new nonce.' },
        { status: 400 }
      );
    }

    // Verify the signature
    try {
      const message = `Sign this nonce to authenticate: ${storedData.nonce}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: 'Invalid signature. The signature does not match the wallet address.' },
          { status: 401 }
        );
      }
    } catch (signatureError) {
      console.error('Signature verification failed:', signatureError);
      return NextResponse.json(
        { success: false, error: 'Invalid signature format or verification failed.' },
        { status: 401 }
      );
    }

    // Clean up used nonce (prevent replay attacks)
    nonceStore.delete(wallet);

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Generate JWT token
    const payload = {
      sub: wallet, // Subject: wallet address
      iat: Math.floor(Date.now() / 1000), // Issued at
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expires in 1 hour
      scope: ['dao:member'] // Optional scope field
    };

    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    console.log(`Authentication successful for wallet ${wallet}`);

    return NextResponse.json({
      success: true,
      token
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}