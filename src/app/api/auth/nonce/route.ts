import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { nonceStore, cleanupExpiredNonces, saveNonceStore } from '../../../../utils/nonce-store';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Clean up expired nonces
    cleanupExpiredNonces();

    // Generate a cryptographically secure nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();

    // Store nonce with address as key
    nonceStore.set(address.toLowerCase(), {
      nonce,
      timestamp,
      used: false
    });

    // Save to file
    saveNonceStore();

    console.log('Generated nonce for address:', address.toLowerCase(), { nonce, timestamp });

    return NextResponse.json({
      success: true,
      nonce,
      message: `Sign this nonce to authenticate: ${nonce}`,
      expiresIn: 300 // 5 minutes
    });

  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json({ error: 'Failed to generate nonce' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}