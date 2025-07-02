import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '../../../../utils/auth-middleware';
import crypto from 'crypto';

// Matrix authentication endpoint
async function matrixAuthHandler(request: AuthenticatedRequest) {
  try {
    const { displayName } = await request.json();
    const walletAddress = request.user!.walletAddress;

    // Generate Matrix username from wallet address
    const generateMatrixUsername = (address: string): string => {
      const shortAddress = address.slice(2, 14).toLowerCase();
      return `wallet_${shortAddress}`;
    };

    // Generate deterministic password from wallet address
    const generateMatrixPassword = async (address: string): Promise<string> => {
      const message = `Matrix password for InfraSim user ${address}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(message + address);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    };

    // Generate MAC for shared secret registration
    const generateRegistrationMac = (username: string, password: string, admin: boolean, secret: string): string => {
      const adminStr = admin ? 'admin' : 'notadmin';
      const message = `${username}\x00${password}\x00${adminStr}`;
      
      const hmac = crypto.createHmac('sha1', secret);
      hmac.update(message);
      return hmac.digest('hex');
    };

    const username = generateMatrixUsername(walletAddress);
    const password = await generateMatrixPassword(walletAddress);
    
    // Use Docker service name directly for container-to-container communication
    const matrixServerUrl = 'http://matrix:8008';

    // First try to login
    const loginPayload = {
      type: 'm.login.password',
      user: username,
      password: password,
      device_id: `infrasim_${Date.now()}`,
      initial_device_display_name: 'InfraSim Wallet Client'
    };

    let loginResponse = await fetch(`${matrixServerUrl}/_matrix/client/v3/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginPayload)
    });

    if (loginResponse.ok) {
      // Login successful
      const loginData = await loginResponse.json();
      return NextResponse.json({
        success: true,
        action: 'login',
        matrixUser: {
          userId: loginData.user_id,
          accessToken: loginData.access_token,
          deviceId: loginData.device_id,
          displayName: displayName || username,
          walletAddress: walletAddress
        }
      });
    }

    // Login failed, try registration
    if (!displayName) {
      return NextResponse.json({
        success: false,
        error: 'Display name required for new user registration',
        requiresDisplayName: true,
        suggestedUsername: username
      }, { status: 400 });
    }

    // Try registration with dummy auth flow first
    const initialRegisterPayload = {
      username: username,
      password: password,
      device_id: `infrasim_${Date.now()}`,
      initial_device_display_name: 'InfraSim Wallet Client'
    };

    console.log('Attempting Matrix registration with initial payload');

    let registerResponse = await fetch(`${matrixServerUrl}/_matrix/client/v3/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initialRegisterPayload)
    });

    console.log('Initial registration response status:', registerResponse.status);
    
    if (!registerResponse.ok) {
      const registerError = await registerResponse.json();
      console.log('Registration error details:', registerError);
      
      // Check if it's an authentication flow error
      if (registerResponse.status === 401 && registerError.flows) {
        // Look for m.login.dummy flow
        const dummyFlow = registerError.flows.find((flow: any) => 
          flow.stages && flow.stages.includes('m.login.dummy')
        );
        
        if (dummyFlow) {
          console.log('Using m.login.dummy flow for registration');
          
          // Complete registration with dummy auth
          const authRegisterPayload = {
            username: username,
            password: password,
            device_id: `infrasim_${Date.now()}`,
            initial_device_display_name: 'InfraSim Wallet Client',
            auth: {
              type: 'm.login.dummy',
              session: registerError.session
            }
          };

          registerResponse = await fetch(`${matrixServerUrl}/_matrix/client/v3/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(authRegisterPayload)
          });

          console.log('Authenticated registration response status:', registerResponse.status);
        }
      }
      
      if (!registerResponse.ok) {
        const finalError = await registerResponse.json();
        console.error('Final registration failed:', finalError);
        return NextResponse.json({
          success: false,
          error: `Matrix registration failed: ${finalError.error || registerResponse.statusText}`,
          details: finalError
        }, { status: 400 });
      }
    }

    const registerData = await registerResponse.json();

    // Set display name for new user
    try {
      await fetch(`${matrixServerUrl}/_matrix/client/v3/profile/${registerData.user_id}/displayname`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${registerData.access_token}`
        },
        body: JSON.stringify({ displayname: displayName })
      });
    } catch (error) {
      console.warn('Failed to set display name:', error);
    }

    // Store wallet address in user profile (custom field)
    try {
      await fetch(`${matrixServerUrl}/_matrix/client/v3/profile/${registerData.user_id}/wallet_address`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${registerData.access_token}`
        },
        body: JSON.stringify({ wallet_address: walletAddress })
      });
    } catch (error) {
      console.warn('Failed to set wallet address in profile:', error);
    }

    return NextResponse.json({
      success: true,
      action: 'register',
      matrixUser: {
        userId: registerData.user_id,
        accessToken: registerData.access_token,
        deviceId: registerData.device_id,
        displayName: displayName,
        walletAddress: walletAddress
      }
    });

  } catch (error) {
    console.error('Matrix authentication failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Matrix authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = requireAuth(matrixAuthHandler);

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}