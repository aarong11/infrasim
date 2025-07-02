import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { nonceStore, saveNonceStore } from '../../../../utils/nonce-store';
import { refreshTokenStore, JWT_SECRET, JWT_REFRESH_SECRET, cleanupExpiredTokens, saveTokenStore } from '../../../../utils/token-store';

// Verify signature using ethers
const verifySignature = (message: string, signature: string, address: string): boolean => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { address, signature, nonce } = await request.json();

    console.log('Auth verify request:', { address, nonce, hasSignature: !!signature });
    console.log('Current nonce store keys:', Array.from(nonceStore.keys()));

    if (!address || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Clean up expired data
    cleanupExpiredTokens();

    // Check if nonce exists and is valid
    const storedNonceData = nonceStore.get(address.toLowerCase());
    console.log('Stored nonce data for address:', address.toLowerCase(), storedNonceData);
    
    if (!storedNonceData) {
      console.log('Nonce not found for address:', address.toLowerCase());
      console.log('Available nonce addresses:', Array.from(nonceStore.keys()));
      return NextResponse.json({ error: 'Nonce not found or expired' }, { status: 400 });
    }

    if (storedNonceData.used) {
      console.log('Nonce already used for address:', address.toLowerCase());
      return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
    }

    // Check if nonce is expired (5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (storedNonceData.timestamp < fiveMinutesAgo) {
      console.log('Nonce expired for address:', address.toLowerCase(), {
        timestamp: storedNonceData.timestamp,
        fiveMinutesAgo,
        age: Date.now() - storedNonceData.timestamp
      });
      nonceStore.delete(address.toLowerCase());
      saveNonceStore(); // Save after cleanup
      return NextResponse.json({ error: 'Nonce expired' }, { status: 400 });
    }

    if (storedNonceData.nonce !== nonce) {
      console.log('Nonce mismatch:', {
        provided: nonce,
        stored: storedNonceData.nonce
      });
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 400 });
    }

    // Verify the signature
    const message = `Sign this nonce to authenticate: ${nonce}`;
    const isValidSignature = verifySignature(message, signature, address);

    if (!isValidSignature) {
      console.log('Invalid signature for address:', address);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Mark nonce as used
    storedNonceData.used = true;
    saveNonceStore(); // Save the updated nonce state

    // Generate JWT tokens
    const now = Math.floor(Date.now() / 1000);
    const accessTokenPayload = {
      address: address.toLowerCase(),
      walletAddress: address.toLowerCase(), // Explicit wallet address field
      type: 'access',
      iat: now,
      exp: now + (15 * 60), // 15 minutes
      // Additional metadata for Matrix integration
      sub: address.toLowerCase(), // Subject (standard JWT claim)
      aud: 'infrasim-matrix', // Audience
    };

    const refreshTokenId = crypto.randomUUID();
    const refreshTokenPayload = {
      address: address.toLowerCase(),
      walletAddress: address.toLowerCase(),
      tokenId: refreshTokenId,
      type: 'refresh',
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
      sub: address.toLowerCase(),
      aud: 'infrasim-matrix',
    };

    const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET);
    const refreshToken = jwt.sign(refreshTokenPayload, JWT_REFRESH_SECRET);

    // Store refresh token
    refreshTokenStore.set(refreshTokenId, {
      tokenId: refreshTokenId,
      address: address.toLowerCase(),
      expiresAt: (now + (7 * 24 * 60 * 60)) * 1000, // Convert to milliseconds
      isRevoked: false
    });

    // Save token store to file
    saveTokenStore();

    console.log('Successfully created tokens for address:', address.toLowerCase());
    console.log('Refresh token stored with ID:', refreshTokenId);

    // Clean up used nonce
    nonceStore.delete(address.toLowerCase());
    saveNonceStore(); // Save after cleanup

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes in seconds
      address: address.toLowerCase()
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}