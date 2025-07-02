'use client';

import React from 'react';
import { Shield, Wallet, Clock, AlertCircle } from 'lucide-react';
import { useUnifiedWallet } from '../providers/UnifiedWalletProvider';

export const UnifiedWalletStatus: React.FC = () => {
  const {
    isInitialized,
    isConnected,
    activeWallet,
    isWebAuthnSupported,
    canCreateWebAuthn,
    canAuthenticateWebAuthn,
  } = useUnifiedWallet();

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg">
        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-400 text-sm">Initializing...</span>
      </div>
    );
  }

  if (!isWebAuthnSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-700/50 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-red-300 text-sm">WebAuthn not supported</span>
      </div>
    );
  }

  if (!isConnected) {
    if (canCreateWebAuthn) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-blue-300 text-sm">No wallet - Click to create</span>
        </div>
      );
    }

    if (canAuthenticateWebAuthn) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <Shield className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-300 text-sm">Wallet locked - Click to unlock</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg">
        <Wallet className="w-4 h-4 text-gray-400" />
        <span className="text-gray-400 text-sm">No wallet connected</span>
      </div>
    );
  }

  if (!activeWallet) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg">
        <Wallet className="w-4 h-4 text-gray-400" />
        <span className="text-gray-400 text-sm">No active wallet</span>
      </div>
    );
  }

  // Connected wallet display
  const getWalletIcon = () => {
    switch (activeWallet.type) {
      case 'webauthn':
        return <Shield className="w-4 h-4 text-green-400" />;
      case 'self-hosted':
        return <Wallet className="w-4 h-4 text-blue-400" />;
      case 'external':
        return <Wallet className="w-4 h-4 text-purple-400" />;
      default:
        return <Wallet className="w-4 h-4 text-gray-400" />;
    }
  };

  const getWalletTypeColor = () => {
    switch (activeWallet.type) {
      case 'webauthn':
        return 'bg-green-900/30 border-green-700/50';
      case 'self-hosted':
        return 'bg-blue-900/30 border-blue-700/50';
      case 'external':
        return 'bg-purple-900/30 border-purple-700/50';
      default:
        return 'bg-gray-800/50 border-gray-600';
    }
  };

  const getWalletTypeLabel = () => {
    switch (activeWallet.type) {
      case 'webauthn':
        return 'WebAuthn';
      case 'self-hosted':
        return 'Self-Hosted';
      case 'external':
        return 'External';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2 ${getWalletTypeColor()} rounded-lg backdrop-blur-sm`}>
      <div className="flex items-center gap-2">
        {getWalletIcon()}
        <span className="text-white font-medium font-mono text-sm">
          {activeWallet.address.slice(0, 6)}...{activeWallet.address.slice(-4)}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded">
          <span className="text-white font-medium text-sm">
            {parseFloat(activeWallet.balance).toFixed(4)} ETH
          </span>
        </div>
        
        {activeWallet.type === 'webauthn' && (activeWallet as any).timeRemaining !== undefined && (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <Clock className="w-3 h-3" />
            <span className="font-mono">
              {Math.floor((activeWallet as any).timeRemaining / 60)}:{((activeWallet as any).timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Wallet type badge */}
      <div className="px-2 py-1 bg-black/30 rounded text-xs font-medium text-white/80">
        {getWalletTypeLabel()}
      </div>
    </div>
  );
};