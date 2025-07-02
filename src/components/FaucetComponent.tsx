'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWebAuthnWallet } from '../providers/UnifiedWalletProvider';
import { WebAuthnWalletComponent } from './WebAuthnWalletComponent';
import { APIThrottler } from '../utils/api-throttler';

interface FaucetStatus {
  ethBalance?: string;
  usdcBalance?: string;
  canClaim?: boolean;
  timeLeft?: number;
  config?: {
    ethAmount: string;
    usdcAmount: string;
    cooldownHours: number;
  };
}

interface ClaimResult {
  success: boolean;
  message: string;
  transactionHash?: string;
  amount?: string;
  token?: string;
  balance?: string;
}

export function FaucetComponent() {
  const { 
    wallet, 
    isConnected, 
    isAuthenticated,
    isRegistered,
    isWebAuthnSupported,
    updateBalance
  } = useWebAuthnWallet();
  
  const [status, setStatus] = useState<FaucetStatus>({});
  const [loading, setLoading] = useState(false);
  const [claimingToken, setClaimingToken] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimResult | null>(null);

  // API throttling
  const apiThrottler = useRef(new APIThrottler({
    minInterval: 1000,
    maxBackoff: 30000,
    maxRetries: 3,
    baseBackoff: 2000
  }));

  // Check faucet status when wallet is available
  useEffect(() => {
    if (wallet?.address && isAuthenticated) {
      checkFaucetStatus();
    }
  }, [wallet?.address, isAuthenticated]);

  const checkFaucetStatus = async () => {
    if (!wallet?.address || !isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await apiThrottler.current.throttledCall(
        () => fetch(`/api/faucet?address=${wallet.address}`),
        'faucet-status'
      );
      const data = await response.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to check faucet status:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimTokens = async (token: 'ETH' | 'USDC') => {
    if (!wallet?.address || !isAuthenticated || !status.canClaim) return;
    
    try {
      setClaimingToken(token);
      setResult(null);
      
      const response = await apiThrottler.current.throttledCall(
        () => fetch('/api/faucet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: wallet.address,
            token
          }),
        }),
        `faucet-claim-${token}`
      );
      
      const data: ClaimResult = await response.json();
      setResult(data);
      
      if (data.success) {
        // Refresh status and wallet balance after successful claim
        setTimeout(async () => {
          await Promise.all([
            checkFaucetStatus(),
            updateBalance() // This will now update both ETH and USDC balances
          ]);
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to claim tokens. Please try again.'
      });
    } finally {
      setClaimingToken(null);
    }
  };

  const formatTimeLeft = (hours: number): string => {
    if (hours <= 0) return 'Available now';
    if (hours < 1) return 'Less than 1 hour';
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const handleRefreshStatus = () => {
    apiThrottler.current.reset('faucet-status'); // Reset backoff for manual refresh
    checkFaucetStatus();
  };

  // Show WebAuthn not supported message
  if (!isWebAuthnSupported) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400 mb-2">🚰 Test Token Faucet</h2>
          <p className="text-gray-400">
            Claim free ETH and USDC tokens for testing your DAO and blockchain interactions
          </p>
        </div>
        
        <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl text-red-400 mb-2">WebAuthn Not Supported</h3>
          <p className="text-gray-300 mb-4">
            Your browser doesn't support WebAuthn authentication, which is required for the secure wallet system.
          </p>
          <p className="text-gray-400 text-sm">
            Please use a modern browser like Chrome, Firefox, Safari, or Edge to access the faucet.
          </p>
        </div>
      </div>
    );
  }

  // Show wallet connection required message
  if (!isRegistered || !isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400 mb-2">🚰 Test Token Faucet</h2>
          <p className="text-gray-400">
            Claim free ETH and USDC tokens for testing your DAO and blockchain interactions
          </p>
        </div>
        
        {/* Wallet Authentication Required */}
        <div className="p-6 bg-blue-900/20 border border-blue-700 rounded-lg text-center mb-6">
          <div className="text-4xl mb-4">🔐</div>
          <h3 className="text-xl text-blue-400 mb-2">Wallet Authentication Required</h3>
          <p className="text-gray-300 mb-4">
            You need to create or log into your secure wallet first to use the faucet.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Look for the wallet section in the top-right corner of the page to get started.
          </p>
          
          {/* Inline wallet component for convenience */}
          <div className="flex justify-center">
            <WebAuthnWalletComponent />
          </div>
        </div>
        
        {/* Benefits of using internal wallet */}
        <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
          <h4 className="text-green-400 font-medium mb-2">✨ Why Use Our Secure Wallet?</h4>
          <ul className="text-gray-300 text-sm space-y-1 text-left">
            <li>• Biometric authentication (fingerprint/face ID)</li>
            <li>• No seed phrases to remember or lose</li>
            <li>• Encrypted storage in your browser</li>
            <li>• Works seamlessly with all InfraSim features</li>
            <li>• Automatic integration with DAOs and faucet</li>
          </ul>
        </div>
      </div>
    );
  }

  // Main faucet interface (only shown when wallet is authenticated)
  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg border border-gray-700">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">🚰 Test Token Faucet</h2>
        <p className="text-gray-400">
          Claim free ETH and USDC tokens for testing your DAO and blockchain interactions
        </p>
      </div>

      {/* Connected Wallet Info */}
      <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-green-400 font-medium">Connected Wallet</h3>
            <p className="text-gray-300 font-mono text-sm">{wallet?.address}</p>
          </div>
          <div className="text-right">
            <div className="text-green-400 font-medium">Current Balance</div>
            <div className="text-white font-mono">{wallet ? parseFloat(wallet.balance).toFixed(4) : '0.0000'} ETH</div>
          </div>
        </div>
      </div>

      {/* Current Balances */}
      {status.ethBalance !== undefined && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-3">Current Token Balances</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{parseFloat(status.ethBalance || '0').toFixed(4)}</div>
              <div className="text-sm text-gray-400">ETH</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{parseFloat(status.usdcBalance || '0').toFixed(2)}</div>
              <div className="text-sm text-gray-400">USDC</div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Buttons */}
      {status.config && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Claim Test Tokens</h3>
          
          {!status.canClaim && status.timeLeft ? (
            <div className="p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg mb-4">
              <p className="text-yellow-400 text-sm">
                ⏰ Next claim available in: {formatTimeLeft(status.timeLeft)}
              </p>
            </div>
          ) : null}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => claimTokens('ETH')}
              disabled={!status.canClaim || claimingToken === 'ETH'}
              className="p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {claimingToken === 'ETH' ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Claiming...</span>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold">Claim {status.config.ethAmount} ETH</div>
                  <div className="text-sm opacity-75">For gas fees and transactions</div>
                </div>
              )}
            </button>
            
            <button
              onClick={() => claimTokens('USDC')}
              disabled={!status.canClaim || claimingToken === 'USDC'}
              className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {claimingToken === 'USDC' ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Claiming...</span>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold">Claim {status.config.usdcAmount} USDC</div>
                  <div className="text-sm opacity-75">For DAO operations and testing</div>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-lg border ${
          result.success 
            ? 'bg-green-900/20 border-green-500' 
            : 'bg-red-900/20 border-red-500'
        }`}>
          <div className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? '✅ Success!' : '❌ Failed'}
          </div>
          <p className="text-gray-300 text-sm mt-1">{result.message}</p>
          
          {result.transactionHash && (
            <div className="mt-2">
              <p className="text-xs text-gray-400">Transaction Hash:</p>
              <code className="block text-xs bg-gray-700 p-2 rounded mt-1 break-all text-cyan-400">
                {result.transactionHash}
              </code>
            </div>
          )}
          
          {result.balance && (
            <p className="text-sm text-gray-400 mt-2">
              New balance: {result.balance}
            </p>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center mt-6">
        <button
          onClick={handleRefreshStatus}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      {/* Information */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
        <h4 className="text-blue-400 font-medium mb-2">ℹ️ Faucet Information</h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Each wallet can claim tokens once every 24 hours</li>
          <li>• ETH is used for gas fees and transaction costs</li>
          <li>• USDC can be used for DAO operations and testing</li>
          <li>• Tokens are only for testing purposes</li>
          <li>• Seamlessly integrated with your secure WebAuthn wallet</li>
          <li>• API calls throttled with exponential backoff for reliability</li>
        </ul>
      </div>
    </div>
  );
}