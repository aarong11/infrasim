'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Clock, Eye, EyeOff, Copy, Download, AlertCircle, CheckCircle, Trash2, Plus, Wallet, Coins } from 'lucide-react';
import { useWebAuthnWallet } from './WebAuthnWalletProvider';
import { navigateToIframe } from '../utils/iframe-navigation';

export const WebAuthnWalletComponent: React.FC = () => {
  const { 
    wallet, 
    isConnected, 
    isAuthenticated,
    isRegistered,
    isWebAuthnSupported,
    registerWallet,
    authenticate,
    disconnect,
    clearWallet,
    updateBalance,
    timeRemaining
  } = useWebAuthnWallet();

  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'manage'>('overview');
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

  const handleClearWallet = () => {
    if (confirm('Are you sure you want to delete your wallet? This action cannot be undone!')) {
      clearWallet();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportWallet = () => {
    if (!wallet) return;
    
    const walletExport = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic,
      exportDate: new Date().toISOString(),
      type: 'WebAuthn Secure Wallet'
    };
    
    const dataStr = JSON.stringify(walletExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `webauthn-wallet-${wallet.address.slice(0, 8)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <span className="text-red-300 text-sm">WebAuthn not supported in this browser</span>
      </div>
    );
  }

  // No wallet registered yet
  if (!isRegistered) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleRegister}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 transition-all duration-200 shadow-lg"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <Shield className="w-4 h-4 mr-2" />
          )}
          Create Secure Wallet
        </button>
        
        {error && (
          <div className="absolute top-full right-0 mt-2 p-3 bg-gray-800 border border-red-700/50 rounded-lg shadow-xl z-50 w-80">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Wallet registered but not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleAuthenticate}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 transition-all duration-200 shadow-lg"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <Fingerprint className="w-4 h-4 mr-2" />
          )}
          Authenticate
        </button>
        
        {error && (
          <div className="absolute top-full right-0 mt-2 p-3 bg-gray-800 border border-red-700/50 rounded-lg shadow-xl z-50 w-80">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Wallet authenticated and active
  return (
    <div className="relative">
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-3 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-200 font-medium font-mono">
              {wallet?.address.slice(0, 6)}...{wallet?.address.slice(-4)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 bg-green-800/30 rounded">
              <span className="text-green-300 font-medium">
                {wallet ? parseFloat(wallet.balance).toFixed(4) : '0.0000'} ETH
              </span>
            </div>
            {wallet?.usdcBalance && (
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-800/30 rounded">
                <span className="text-blue-300 font-medium">
                  {parseFloat(wallet.usdcBalance).toFixed(2)} USDC
                </span>
              </div>
            )}
          </div>
          
          {/* Session timeout indicator */}
          <div className="flex items-center gap-1 text-xs text-green-400">
            <Clock className="w-3 h-3" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>
          
          <button
            onClick={updateBalance}
            className="text-green-400 hover:text-green-300 transition-colors"
            title="Refresh balance"
          >
            <CheckCircle className="w-3 h-3" />
          </button>
        </div>
        
        {/* View in Explorer shortcut */}
        <a
          href={`/explorer/address/${wallet?.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20 rounded-lg transition-colors"
          title="View address in explorer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 rounded-lg transition-colors"
          title="Wallet actions"
        >
          <Shield className="w-4 h-4" />
        </button>
      </div>

      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 w-[500px] backdrop-blur-sm">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-gray-700 text-white border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Overview
            </button>
            <a
              href="/wallet"
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors text-center"
              onClick={(e) => {
                e.preventDefault();
                navigateToIframe('/wallet');
              }}
            >
              <Wallet className="w-4 h-4 inline mr-2" />
              Full View
            </a>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">WebAuthn Secure Wallet</h3>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <Shield className="w-3 h-3" />
                  <span>Encrypted</span>
                </div>
              </div>
              
              {/* Quick Address Switcher */}
              {wallet?.addresses && wallet.addresses.length > 0 && (
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Quick Switch:</label>
                    <a
                      href="/wallet"
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Full View →
                    </a>
                  </div>
                  <select
                    onChange={(e) => {
                      const addressId = e.target.value;
                      if (addressId && addressId !== 'primary') {
                        // Handle address switching
                        console.log('Switch to address:', addressId);
                      }
                    }}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                  >
                    <option value="primary">Primary: {wallet.address.slice(0, 10)}...</option>
                    {wallet.addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label}: {addr.address.slice(0, 10)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 mb-4">
                <a
                  href="/wallet"
                  className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  New Address
                </a>
                <a
                  href="/wallet"
                  className="flex items-center gap-1 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Coins className="w-3 h-3" />
                  Add Token
                </a>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Address:</label>
                  <button
                    onClick={() => copyToClipboard(wallet?.address || '')}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    title="Copy address"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={wallet?.address || ''}
                  readOnly
                  className="w-full p-2 text-xs bg-gray-900/50 border border-gray-600 rounded text-gray-200 font-mono focus:border-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Private Key:</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                      title="Toggle visibility"
                    >
                      {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(wallet?.privateKey || '')}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      title="Copy private key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <input
                  type={showPrivateKey ? "text" : "password"}
                  value={wallet?.privateKey || ''}
                  readOnly
                  className="w-full p-2 text-xs bg-gray-900/50 border border-gray-600 rounded text-gray-200 font-mono focus:border-cyan-400"
                />
              </div>

              {wallet?.mnemonic && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Mnemonic:</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowMnemonic(!showMnemonic)}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        title="Toggle visibility"
                      >
                        {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(wallet?.mnemonic || '')}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="Copy mnemonic"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={showMnemonic ? wallet?.mnemonic : '••••• ••••• ••••• •••••'}
                    readOnly
                    className="w-full p-2 text-xs bg-gray-900/50 border border-gray-600 rounded text-gray-200 font-mono focus:border-cyan-400"
                    rows={2}
                  />
                </div>
              )}

              {/* Security Features */}
              <div className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg">
                <h4 className="font-medium text-blue-300 mb-2 text-sm">Security Features:</h4>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>✓ WebAuthn biometric authentication</li>
                  <li>✓ AES-GCM encrypted storage</li>
                  <li>✓ 5-minute session timeout</li>
                  <li>✓ No external dependencies</li>
                  <li>✓ PBKDF2 key derivation (100k iterations)</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-700">
                <button
                  onClick={exportWallet}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
                <button
                  onClick={disconnect}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                >
                  Lock
                </button>
                <button
                  onClick={handleClearWallet}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};