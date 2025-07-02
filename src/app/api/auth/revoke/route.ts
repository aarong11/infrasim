import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { refreshTokenStore, JWT_REFRESH_SECRET } from '../../../../utils/token-store';
import { requireAuth, AuthenticatedRequest } from '../../../../utils/auth-middleware';

async function revokeTokenHandler(request: AuthenticatedRequest) {
  try {
    const { refreshToken, revokeAll = false } = await request.json();

    if (!refreshToken && !revokeAll) {
      return NextResponse.json({ error: 'Refresh token required or specify revokeAll' }, { status: 400 });
    }

    const userAddress = request.user!.address;

    if (revokeAll) {
      // Revoke all refresh tokens for this user
      let revokedCount = 0;
      for (const [tokenId, tokenData] of refreshTokenStore.entries()) {
        if (tokenData.address === userAddress) {
          tokenData.isRevoked = true;
          revokedCount++;
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Revoked ${revokedCount} refresh tokens`,
        revokedCount
      });
    }

    if (refreshToken) {
      // Revoke specific refresh token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (error) {
        return NextResponse.json({ error: 'Invalid refresh token' }, { status: 400 });
      }

      // Ensure user can only revoke their own tokens
      if (decoded.address !== userAddress) {
        return NextResponse.json({ error: 'Cannot revoke token for different user' }, { status: 403 });
      }

      const storedToken = refreshTokenStore.get(decoded.tokenId);
      if (storedToken) {
        storedToken.isRevoked = true;
        return NextResponse.json({
          success: true,
          message: 'Refresh token revoked successfully'
        });
      } else {
        return NextResponse.json({ error: 'Refresh token not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Error revoking token:', error);
    return NextResponse.json({ error: 'Token revocation failed' }, { status: 500 });
  }
}

export const POST = requireAuth(revokeTokenHandler);

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}