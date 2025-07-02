import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './token-store';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    address: string;
    walletAddress: string;
    type: string;
    iat: number;
    exp: number;
    sub: string;
    aud: string;
  };
}

export function verifyJWTToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractTokenFromRequest(request);
      
      if (!token) {
        return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
      }

      const decoded = verifyJWTToken(token);
      
      if (decoded.type !== 'access') {
        return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
      }

      // Add user info to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = decoded;

      return await handler(authenticatedRequest);
    } catch (error) {
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 401 });
    }
  };
}

export function optionalAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractTokenFromRequest(request);
      
      if (token) {
        try {
          const decoded = verifyJWTToken(token);
          if (decoded.type === 'access') {
            const authenticatedRequest = request as AuthenticatedRequest;
            authenticatedRequest.user = decoded;
          }
        } catch (error) {
          // Token invalid but we continue without auth
          console.warn('Invalid token in optional auth:', error);
        }
      }

      return await handler(request as AuthenticatedRequest);
    } catch (error) {
      return NextResponse.json({ 
        error: 'Server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }
  };
}