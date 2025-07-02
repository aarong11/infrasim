'use client';

import React, { useState, useEffect } from 'react';
import { useWebAuthnWallet } from '../../providers/UnifiedWalletProvider';
import { MatrixClient } from '../../components/MatrixClient';
import { JWTAuthService } from '../../services/jwt-auth-service';
import { MatrixAuthService, MatrixUser } from '../../services/matrix-auth-service';

// Wallet Authentication Button Component
const AuthenticateButton: React.FC = () => {
  const { 
    isAuthenticated, 
    isRegistered, 
    isWebAuthnSupported, 
    registerWallet, 
    authenticate 
  } = useWebAuthnWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAuthenticate = async () => {
    if (!isWebAuthnSupported) {
      setAuthError('WebAuthn is not supported in this browser');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      if (isRegistered) {
        await authenticate();
      } else {
        await registerWallet();
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isWebAuthnSupported) {
    return (
      <div className="text-center">
        <p className="text-red-400 mb-4">❌ WebAuthn not supported in this browser</p>
        <p className="text-gray-500 text-sm">
          Please use a modern browser that supports WebAuthn for wallet authentication.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleAuthenticate}
        disabled={isAuthenticating || isAuthenticated}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center mx-auto"
      >
        {isAuthenticating ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            {isRegistered ? 'Authenticating...' : 'Creating Wallet...'}
          </>
        ) : (
          <>
            🔐 {isRegistered ? 'Authenticate with Wallet' : 'Create & Authenticate Wallet'}
          </>
        )}
      </button>
      
      {authError && (
        <div className="text-red-400 text-sm text-center">
          {authError}
        </div>
      )}
      
      <div className="text-gray-500 text-xs text-center">
        {isRegistered 
          ? 'Use your biometric authentication to unlock your wallet'
          : 'This will create a new wallet secured with biometric authentication'
        }
      </div>
    </div>
  );
};

export default function MatrixTestPage() {
  const { isJWTAuthenticated, jwtAuthState } = useWebAuthnWallet();
  const [matrixUser, setMatrixUser] = useState<MatrixUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [needsDisplayName, setNeedsDisplayName] = useState(false);
  const [jwtAuthService] = useState(() => JWTAuthService.getInstance());
  const [matrixAuthService] = useState(() => MatrixAuthService.getInstance());
  
  // Prevent multiple simultaneous connection attempts
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);

  // Load stored Matrix user on component mount
  useEffect(() => {
    const storedUser = matrixAuthService.loadStoredMatrixUser();
    if (storedUser) {
      setMatrixUser(storedUser);
    }
  }, [matrixAuthService]);

  // Auto-connect to Matrix when JWT is authenticated (only once)
  useEffect(() => {
    if (isJWTAuthenticated && !matrixUser && !isConnecting && !hasAttemptedConnection) {
      setHasAttemptedConnection(true);
      handleMatrixConnect();
    }
  }, [isJWTAuthenticated, matrixUser, isConnecting, hasAttemptedConnection]);

  const handleMatrixConnect = async (providedDisplayName?: string) => {
    if (!isJWTAuthenticated) {
      setError('Please authenticate with your wallet first');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Try to authenticate with Matrix using API endpoint
      const response = await jwtAuthService.authenticatedFetch('/api/matrix/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: providedDisplayName || displayName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.requiresDisplayName) {
          setNeedsDisplayName(true);
          setError('Display name required for new user registration');
          // Pre-populate the display name field with the suggested username
          if (errorData.suggestedUsername && !displayName) {
            setDisplayName(errorData.suggestedUsername);
          }
          setIsConnecting(false); // Ensure loading state is cleared
          return;
        }
        
        throw new Error(errorData.error || 'Matrix authentication failed');
      }

      const data = await response.json();
      const newMatrixUser = data.matrixUser;
      
      setMatrixUser(newMatrixUser);
      setNeedsDisplayName(false);
      setError(null); // Clear any previous errors
      
      // Store in localStorage
      localStorage.setItem('matrixUser', JSON.stringify(newMatrixUser));

    } catch (err) {
      console.error('Matrix connection failed:', err);
      
      // Check if it's a JWT authentication issue
      if (err instanceof Error && err.message.includes('Authentication failed')) {
        setError('Wallet authentication expired. Please re-authenticate with your wallet.');
        // Clear JWT state to force re-authentication
        await jwtAuthService.logout();
      } else {
        setError(err instanceof Error ? err.message : 'Failed to connect to Matrix');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisplayNameSubmit = () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    handleMatrixConnect(displayName.trim());
  };

  const handleDisconnect = async () => {
    setMatrixUser(null);
    localStorage.removeItem('matrixUser');
    await matrixAuthService.logout();
  };

  const getWalletInfo = () => {
    const payload = jwtAuthService.getTokenPayload();
    if (!payload) return null;
    
    return {
      address: payload.walletAddress,
      shortAddress: payload.walletAddress.slice(0, 6) + '...' + payload.walletAddress.slice(-4)
    };
  };

  const walletInfo = getWalletInfo();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
      <div className="max-w-full mx-auto">
        {/* Wallet Authentication Status - Only show if not connected to Matrix */}
        {!matrixUser && (
          <div className="mb-6 bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">🔐 Authentication Status</h3>
            
            {!isJWTAuthenticated ? (
              <div className="text-yellow-400">
                ⚠️ Please authenticate with your wallet first to access Matrix chat
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-green-400">
                  ✅ Wallet authenticated: {walletInfo?.shortAddress}
                </div>
                
                <div className="text-yellow-400">
                  🔄 Matrix: {isConnecting ? 'Connecting...' : 'Not connected'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Display Name Input for New Users */}
        {needsDisplayName && (
          <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">👤 Choose Your Display Name</h3>
            <p className="text-gray-300 mb-4">
              This is your first time using Matrix. Please choose a display name for the chat.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleDisplayNameSubmit()}
              />
              <button
                onClick={handleDisplayNameSubmit}
                disabled={isConnecting || !displayName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-300 mb-2">❌ Error</h3>
            <p className="text-red-200">{error}</p>
            {!needsDisplayName && (
              <button
                onClick={() => handleMatrixConnect()}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Retry Connection
              </button>
            )}
          </div>
        )}

        <div className="w-full">
          {/* Matrix Client - Full Screen Width */}
          <div className="mt-4">
            {matrixUser ? (
              <div>
                <MatrixClient 
                  userId={matrixUser.userId}
                  accessToken={matrixUser.accessToken}
                  baseUrl="http://localhost:8008"
                />
              </div>
            ) : isJWTAuthenticated ? (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-4">Connect to Matrix</h3>
                {isConnecting ? (
                  <div className="space-y-4">
                    <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400">Connecting to Matrix...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-400">
                      Click below to automatically connect to Matrix using your wallet authentication.
                    </p>
                    <button
                      onClick={() => handleMatrixConnect()}
                      className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium"
                    >
                      Connect to Matrix
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-4">Wallet Authentication Required</h3>
                <p className="text-gray-400 mb-4">
                  Please authenticate with your wallet to access Matrix chat.
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Your wallet address will be used to automatically create and authenticate your Matrix account.
                </p>
                <AuthenticateButton />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}