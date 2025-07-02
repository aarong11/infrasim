import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { refreshTokenStore, JWT_SECRET, JWT_REFRESH_SECRET, saveTokenStore } from '../../../../utils/token-store';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    console.log('Refresh token request received');
    console.log('Current refresh token store size:', refreshTokenStore.size);
    console.log('Refresh token store keys:', Array.from(refreshTokenStore.keys()));

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      console.log('Decoded refresh token:', { tokenId: decoded.tokenId, address: decoded.address, exp: decoded.exp });
    } catch (error) {
      console.log('JWT verification failed:', error);
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    if (decoded.type !== 'refresh') {
      console.log('Invalid token type:', decoded.type);
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }

    // Check if refresh token exists in store and is not revoked
    const storedToken = refreshTokenStore.get(decoded.tokenId);
    console.log('Stored token data for ID:', decoded.tokenId, storedToken);
    
    if (!storedToken || storedToken.isRevoked) {
      console.log('Refresh token not found or revoked:', { 
        found: !!storedToken, 
        revoked: storedToken?.isRevoked 
      });
      return NextResponse.json({ error: 'Refresh token revoked or not found' }, { status: 401 });
    }

    // Check if token is expired
    if (storedToken.expiresAt < Date.now()) {
      console.log('Refresh token expired:', {
        expiresAt: storedToken.expiresAt,
        now: Date.now(),
        expired: storedToken.expiresAt < Date.now()
      });
      refreshTokenStore.delete(decoded.tokenId);
      return NextResponse.json({ error: 'Refresh token expired' }, { status: 401 });
    }

    // Generate new access token
    const now = Math.floor(Date.now() / 1000);
    const accessTokenPayload = {
      address: decoded.address,
      walletAddress: decoded.address, // Explicit wallet address field
      type: 'access',
      iat: now,
      exp: now + (15 * 60), // 15 minutes
      sub: decoded.address,
      aud: 'infrasim-matrix',
    };

    const newAccessToken = jwt.sign(accessTokenPayload, JWT_SECRET);

    // Optionally rotate refresh token (recommended for security)
    const newRefreshTokenId = crypto.randomUUID();
    const refreshTokenPayload = {
      address: decoded.address,
      walletAddress: decoded.address,
      tokenId: newRefreshTokenId,
      type: 'refresh',
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
      sub: decoded.address,
      aud: 'infrasim-matrix',
    };

    const newRefreshToken = jwt.sign(refreshTokenPayload, JWT_REFRESH_SECRET);

    // Update refresh token in store
    refreshTokenStore.delete(decoded.tokenId); // Remove old token
    refreshTokenStore.set(newRefreshTokenId, {
      tokenId: newRefreshTokenId,
      address: decoded.address,
      expiresAt: (now + (7 * 24 * 60 * 60)) * 1000,
      isRevoked: false
    });

    // Save token store to file
    saveTokenStore();

    console.log('Successfully refreshed tokens for address:', decoded.address);
    console.log('New refresh token ID:', newRefreshTokenId);

    console.log('New tokens generated:', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes in seconds
      address: decoded.address
    });

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes in seconds
      address: decoded.address
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}