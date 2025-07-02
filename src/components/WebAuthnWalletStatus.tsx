'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useUnifiedWallet } from '../providers/UnifiedWalletProvider';
import { WebAuthnWallet } from '../store/wallet-store';

export const WebAuthnWalletStatus: React.FC = () => {
  const {
    webauthnWallets,
    activeWallet,
    isWebAuthnConnected,
    isWebAuthnAuthenticated,
    isWebAuthnRegistered,
    isWebAuthnSupported,
    createWebAuthnWallet,
    authenticateWebAuthn,
    updateBalance
  } = useUnifiedWallet();

  // Get the primary WebAuthn wallet
  const wallet = webauthnWallets[0] as WebAuthnWallet | undefined;
  const isAuthenticated = isWebAuthnAuthenticated;
  const isRegistered = isWebAuthnRegistered;
  const registerWallet = createWebAuthnWallet;
  const authenticate = authenticateWebAuthn;
  const timeRemaining = wallet?.timeRemaining || 0;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      setError('');
      await registerWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to register wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    try {
      setIsLoading(true);
      setError('');
      await authenticate();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // WebAuthn not supported
  if (!isWebAuthnSupported) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <span className="text-red-300 text-sm">WebAuthn not supported</span>
      </div>
    );
  }

  // No wallet registered yet
  if (!isRegistered) {
    return (
      <button
        onClick={handleRegister}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 transition-all duration-200"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        ) : (
          <Shield className="w-4 h-4 mr-2" />
        )}
        Create Wallet
      </button>
    );
  }

  // Wallet registered but not authenticated
  if (!isAuthenticated) {
    return (
      <button
        onClick={handleAuthenticate}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 transition-all duration-200"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        ) : (
          <Fingerprint className="w-4 h-4 mr-2" />
        )}
        Authenticate
      </button>
    );
  }

  // Wallet authenticated and active - compact status view
  return (
    <div className="relative">
      <div className="flex items-center gap-3 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded-lg backdrop-blur-sm hover:bg-green-900/40 transition-colors cursor-pointer">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-green-200 font-medium font-mono text-sm">
            {wallet?.address.slice(0, 6)}...{wallet?.address.slice(-4)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-green-300 font-medium text-sm">
            {wallet ? parseFloat(wallet.balance).toFixed(4) : '0.0000'} ETH
          </span>
          
          <div className="flex items-center gap-1 text-xs text-green-400">
            <Clock className="w-3 h-3" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};