'use client';

import React, { useState, useEffect } from 'react';
import { isIframeMode } from '../../utils/iframe-navigation';
import { useWebAuthnWallet } from '../../components/WebAuthnWalletProvider';
import { Shield, Wallet, Coins, Plus, Copy, Eye, EyeOff, Trash2, Check, X, RefreshCw, Send, Download, Upload, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

export default function WalletPage() {
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
    updateTokenBalances,
    createNewAddress,
    switchToAddress,
    addCustomToken,
    removeCustomToken,
    getTokenBalance,
    timeRemaining
  } = useWebAuthnWallet();

  const [activeTab, setActiveTab] = useState<'overview' | 'addresses' | 'tokens' | 'transactions' | 'settings'>('overview');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inIframe, setInIframe] = useState(false);

  // Address management state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [showPrivateKeys, setShowPrivateKeys] = useState<Record<string, boolean>>({});

  // Token management state
  const [showNewTokenForm, setShowNewTokenForm] = useState(false);
  const [newToken, setNewToken] = useState({
    address: '',
    symbol: '',
    name: '',
    decimals: 18,
    enabled: true
  });

  // Transaction state (mock data for now)
  const [transactions] = useState([
    {
      id: '1',
      type: 'send',
      amount: '0.1',
      token: 'ETH',
      to: '0x742d35cc6574c92b0cfa7d3e82ad7d82c8e2f3c4',
      hash: '0xabc123...',
      timestamp: Date.now() - 3600000,
      status: 'confirmed'
    },
    {
      id: '2',
      type: 'receive',
      amount: '1000',
      token: 'USDC',
      from: '0x8ba1f109551bd432803012645hac136c90cba7e',
      hash: '0xdef456...',
      timestamp: Date.now() - 7200000,
      status: 'confirmed'
    }
  ]);

  useEffect(() => {
    // Check if we're in iframe mode
    setInIframe(isIframeMode());
    
    if (isAuthenticated && wallet) {
      updateBalance();
      updateTokenBalances();
    }
  }, [isAuthenticated, wallet]);

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      setError('');
      await registerWallet();
      setSuccess('Wallet created successfully!');
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
      setSuccess('Authentication successful!');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAddress = async () => {
    if (!newAddressLabel.trim()) return;
    
    try {
      setIsLoading(true);
      setError('');
      await createNewAddress(newAddressLabel);
      setNewAddressLabel('');
      setShowNewAddressForm(false);
      setSuccess('New address created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to create address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToken = async () => {
    if (!newToken.address || !newToken.symbol || !newToken.name) return;
    
    try {
      setIsLoading(true);
      setError('');
      await addCustomToken(newToken);
      setNewToken({ address: '', symbol: '', name: '', decimals: 18, enabled: true });
      setShowNewTokenForm(false);
      await updateTokenBalances();
      setSuccess('Token added successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to add token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchAddress = async (addressId: string) => {
    try {
      setIsLoading(true);
      await switchToAddress(addressId);
      setSuccess('Switched to address successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to switch address');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied to clipboard!');
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const exportWallet = () => {
    if (!wallet) return;
    
    const walletExport = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic,
      addresses: wallet.addresses,
      customTokens: wallet.customTokens,
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

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const isIframeMode = (): boolean => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  // If in iframe mode, render without the header
  const renderContent = () => {
    return (
      <div className={inIframe ? "" : "min-h-screen bg-gray-900 text-white"}>
        {/* Header - only show if not in iframe */}
        {!inIframe && (
          <div className="bg-gray-800 border-b border-gray-700 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Shield className="w-8 h-8 text-cyan-400" />
                  <div>
                    <h1 className="text-3xl font-bold text-white">Secure Wallet</h1>
                    <p className="text-gray-400">WebAuthn-protected cryptocurrency wallet</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="text-green-300 text-sm font-mono">{formatTime(timeRemaining)}</span>
                  </div>
                  <button
                    onClick={() => updateBalance()}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Refresh balances"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Wallet Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm">ETH Balance</p>
                      <p className="text-white text-2xl font-bold">
                        {wallet ? parseFloat(wallet.balance).toFixed(4) : '0.0000'}
                      </p>
                    </div>
                    <Wallet className="w-8 h-8 text-cyan-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">USDC Balance</p>
                      <p className="text-white text-2xl font-bold">
                        {wallet?.usdcBalance ? parseFloat(wallet.usdcBalance).toFixed(2) : '0.00'}
                      </p>
                    </div>
                    <Coins className="w-8 h-8 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Total Addresses</p>
                      <p className="text-white text-2xl font-bold">
                        {1 + (wallet?.addresses?.length || 0)}
                      </p>
                    </div>
                    <Shield className="w-8 h-8 text-purple-200" />
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="mt-6 flex space-x-1 bg-gray-700 p-1 rounded-lg">
                {[
                  { id: 'overview', label: 'Overview', icon: Wallet },
                  { id: 'addresses', label: 'Addresses', icon: Shield },
                  { id: 'tokens', label: 'Tokens', icon: Coins },
                  { id: 'transactions', label: 'Transactions', icon: ArrowUpRight },
                  { id: 'settings', label: 'Settings', icon: Shield }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === id
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={inIframe ? "p-6" : "max-w-6xl mx-auto p-6"}>
          {inIframe && (
            <>
              {/* Iframe Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Shield className="w-8 h-8 text-cyan-400" />
                    <div>
                      <h1 className="text-3xl font-bold text-white">Secure Wallet</h1>
                      <p className="text-gray-400">WebAuthn-protected cryptocurrency wallet</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span className="text-green-300 text-sm font-mono">{formatTime(timeRemaining)}</span>
                    </div>
                    <button
                      onClick={() => updateBalance()}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Refresh balances"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Wallet Overview Cards for iframe */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm">ETH Balance</p>
                        <p className="text-white text-2xl font-bold">
                          {wallet ? parseFloat(wallet.balance).toFixed(4) : '0.0000'}
                        </p>
                      </div>
                      <Wallet className="w-8 h-8 text-cyan-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">USDC Balance</p>
                        <p className="text-white text-2xl font-bold">
                          {wallet?.usdcBalance ? parseFloat(wallet.usdcBalance).toFixed(2) : '0.00'}
                        </p>
                      </div>
                      <Coins className="w-8 h-8 text-blue-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Total Addresses</p>
                        <p className="text-white text-2xl font-bold">
                          {1 + (wallet?.addresses?.length || 0)}
                        </p>
                      </div>
                      <Shield className="w-8 h-8 text-purple-200" />
                    </div>
                  </div>
                </div>

                {/* Tab Navigation for iframe */}
                <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
                  {[
                    { id: 'overview', label: 'Overview', icon: Wallet },
                    { id: 'addresses', label: 'Addresses', icon: Shield },
                    { id: 'tokens', label: 'Tokens', icon: Coins },
                    { id: 'transactions', label: 'Transactions', icon: ArrowUpRight },
                    { id: 'settings', label: 'Settings', icon: Shield }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === id
                          ? 'bg-cyan-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-300">{success}</p>
              <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Primary Address */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  Primary Address
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm">Address</p>
                      <p className="font-mono text-white break-all">{wallet?.address}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(wallet?.address || '')}
                      className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-gray-600 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                      <p className="text-green-300 text-sm">ETH Balance</p>
                      <p className="text-white text-xl font-bold">
                        {wallet ? parseFloat(wallet.balance).toFixed(6) : '0.000000'} ETH
                      </p>
                    </div>
                    <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                      <p className="text-blue-300 text-sm">USDC Balance</p>
                      <p className="text-white text-xl font-bold">
                        {wallet?.usdcBalance ? parseFloat(wallet.usdcBalance).toFixed(6) : '0.000000'} USDC
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className="flex flex-col items-center gap-2 p-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-sm">New Address</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('tokens')}
                    className="flex flex-col items-center gap-2 p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                  >
                    <Coins className="w-6 h-6" />
                    <span className="text-sm">Add Token</span>
                  </button>
                  <button
                    onClick={exportWallet}
                    className="flex flex-col items-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Download className="w-6 h-6" />
                    <span className="text-sm">Export</span>
                  </button>
                  <a
                    href={`/explorer/address/${wallet?.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-6 h-6" />
                    <span className="text-sm">Explorer</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Manage Addresses</h3>
                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Address
                </button>
              </div>

              {/* Primary Address */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    Primary Address
                  </h4>
                  <span className="px-3 py-1 bg-green-800 text-green-200 text-sm rounded-full">Current</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm">Address</p>
                      <p className="font-mono text-white text-sm break-all">{wallet?.address}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Balance: {wallet ? parseFloat(wallet.balance).toFixed(6) : '0.000000'} ETH
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(wallet?.address || '')}
                        className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-gray-600 rounded transition-colors"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`/explorer/address/${wallet?.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-purple-400 hover:text-purple-300 hover:bg-gray-600 rounded transition-colors"
                        title="View in explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Addresses */}
              {wallet?.addresses && wallet.addresses.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Additional Addresses</h4>
                  <div className="space-y-4">
                    {wallet.addresses.map((addr) => (
                      <div key={addr.id} className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="text-white font-medium">{addr.label}</h5>
                              {addr.isDefault && (
                                <span className="px-2 py-1 bg-blue-800 text-blue-200 text-xs rounded">Default</span>
                              )}
                            </div>
                            <p className="font-mono text-gray-300 text-sm break-all">{addr.address}</p>
                            <p className="text-gray-400 text-xs mt-1">
                              Balance: {parseFloat(addr.balance).toFixed(6)} ETH
                            </p>
                            
                            {/* Private Key Toggle */}
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={() => setShowPrivateKeys(prev => ({
                                  ...prev,
                                  [addr.id]: !prev[addr.id]
                                }))}
                                className="text-gray-400 hover:text-gray-200 transition-colors text-xs"
                              >
                                {showPrivateKeys[addr.id] ? (
                                  <span className="flex items-center gap-1">
                                    <EyeOff className="w-3 h-3" /> Hide Private Key
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> Show Private Key
                                  </span>
                                )}
                              </button>
                            </div>
                            
                            {showPrivateKeys[addr.id] && (
                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={addr.privateKey}
                                  readOnly
                                  className="flex-1 p-2 text-xs bg-gray-900/50 border border-gray-600 rounded text-gray-200 font-mono"
                                />
                                <button
                                  onClick={() => copyToClipboard(addr.privateKey)}
                                  className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                                  title="Copy private key"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleSwitchAddress(addr.id)}
                              disabled={isLoading}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                            >
                              Switch To
                            </button>
                            <button
                              onClick={() => copyToClipboard(addr.address)}
                              className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                              title="Copy address"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Address Form */}
              {showNewAddressForm && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Create New Address</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Address Label
                      </label>
                      <input
                        type="text"
                        value={newAddressLabel}
                        onChange={(e) => setNewAddressLabel(e.target.value)}
                        placeholder="e.g., Trading Account, DAO Operations, Personal"
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCreateAddress}
                        disabled={isLoading || !newAddressLabel.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Create Address
                      </button>
                      <button
                        onClick={() => {
                          setShowNewAddressForm(false);
                          setNewAddressLabel('');
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Manage Tokens</h3>
                <button
                  onClick={() => setShowNewTokenForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Token
                </button>
              </div>

              {/* Built-in Tokens */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h4 className="text-lg font-medium text-white mb-4">Built-in Tokens</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">Ξ</span>
                      </div>
                      <div>
                        <h5 className="text-white font-medium">Ethereum</h5>
                        <p className="text-gray-400 text-sm">ETH - Native token</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">
                        {wallet ? parseFloat(wallet.balance).toFixed(6) : '0.000000'}
                      </p>
                      <p className="text-gray-400 text-sm">ETH</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">$</span>
                      </div>
                      <div>
                        <h5 className="text-white font-medium">USD Coin</h5>
                        <p className="text-gray-400 text-sm">USDC - Stablecoin</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">
                        {wallet?.usdcBalance ? parseFloat(wallet.usdcBalance).toFixed(6) : '0.000000'}
                      </p>
                      <p className="text-gray-400 text-sm">USDC</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Tokens */}
              {wallet?.customTokens && wallet.customTokens.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Custom Tokens</h4>
                  <div className="space-y-4">
                    {wallet.customTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{token.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <h5 className="text-white font-medium">{token.name}</h5>
                            <p className="text-gray-400 text-sm">{token.symbol} - {token.decimals} decimals</p>
                            <p className="text-gray-500 text-xs font-mono">{token.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-white font-bold">
                              {token.balance ? parseFloat(token.balance).toFixed(6) : '0.000000'}
                            </p>
                            <p className="text-gray-400 text-sm">{token.symbol}</p>
                          </div>
                          <button
                            onClick={() => removeCustomToken(token.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                            title="Remove token"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Token Form */}
              {showNewTokenForm && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Add Custom Token</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Token Contract Address
                      </label>
                      <input
                        type="text"
                        value={newToken.address}
                        onChange={(e) => setNewToken({ ...newToken, address: e.target.value })}
                        placeholder="0x..."
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none font-mono"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Symbol
                        </label>
                        <input
                          type="text"
                          value={newToken.symbol}
                          onChange={(e) => setNewToken({ ...newToken, symbol: e.target.value })}
                          placeholder="e.g., USDT"
                          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Decimals
                        </label>
                        <input
                          type="number"
                          value={newToken.decimals}
                          onChange={(e) => setNewToken({ ...newToken, decimals: parseInt(e.target.value) || 18 })}
                          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Token Name
                      </label>
                      <input
                        type="text"
                        value={newToken.name}
                        onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                        placeholder="e.g., Tether USD"
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddToken}
                        disabled={isLoading || !newToken.address || !newToken.symbol || !newToken.name}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Add Token
                      </button>
                      <button
                        onClick={() => {
                          setShowNewTokenForm(false);
                          setNewToken({ address: '', symbol: '', name: '', decimals: 18, enabled: true });
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Transaction History</h3>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                    <Send className="w-4 h-4 inline mr-2" />
                    Send
                  </button>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Download className="w-4 h-4 inline mr-2" />
                    Receive
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-6xl mb-4">📝</div>
                    <h4 className="text-lg text-gray-300 mb-2">No transactions yet</h4>
                    <p className="text-gray-500">Your transaction history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'send' ? 'bg-red-600' : 'bg-green-600'
                          }`}>
                            {tx.type === 'send' ? (
                              <ArrowUpRight className="w-5 h-5 text-white" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-white font-medium capitalize">{tx.type} {tx.token}</h5>
                            <p className="text-gray-400 text-sm">
                              {tx.type === 'send' ? `To: ${tx.to?.slice(0, 10)}...` : `From: ${tx.from?.slice(0, 10)}...`}
                            </p>
                            <p className="text-gray-500 text-xs">{formatTimestamp(tx.timestamp)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.type === 'send' ? 'text-red-400' : 'text-green-400'}`}>
                            {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.token}
                          </p>
                          <p className="text-gray-400 text-sm">{tx.status}</p>
                          <button
                            onClick={() => copyToClipboard(tx.hash)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            {tx.hash}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Wallet Settings</h3>

              {/* Security Settings */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  Security Settings
                </h4>
                
                <div className="space-y-6">
                  {/* Private Key Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-300">Private Key</label>
                      <button
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type={showPrivateKey ? "text" : "password"}
                        value={wallet?.privateKey || ''}
                        readOnly
                        className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:border-cyan-400"
                      />
                      <button
                        onClick={() => copyToClipboard(wallet?.privateKey || '')}
                        className="p-3 text-cyan-400 hover:text-cyan-300 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mnemonic Section */}
                  {wallet?.mnemonic && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">Mnemonic Phrase</label>
                        <button
                          onClick={() => setShowMnemonic(!showMnemonic)}
                          className="text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <textarea
                          value={showMnemonic ? wallet.mnemonic : '••••• ••••• ••••• ••••• ••••• ••••• ••••• ••••• ••••• ••••• ••••• •••••'}
                          readOnly
                          rows={3}
                          className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:border-cyan-400"
                        />
                        <button
                          onClick={() => copyToClipboard(wallet?.mnemonic || '')}
                          className="p-3 text-cyan-400 hover:text-cyan-300 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Security Features */}
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <h5 className="text-blue-300 font-medium mb-3">Security Features</h5>
                    <ul className="space-y-2 text-sm text-blue-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        WebAuthn biometric authentication
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        AES-GCM encrypted storage (256-bit)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        PBKDF2 key derivation (100,000 iterations)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Device-bound security
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Auto-timeout protection ({formatTime(timeRemaining)})
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Wallet Actions */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h4 className="text-lg font-medium text-white mb-4">Wallet Actions</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-white font-medium">Export Wallet</h5>
                      <p className="text-gray-400 text-sm">Download wallet data as JSON file</p>
                    </div>
                    <button
                      onClick={exportWallet}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-white font-medium">Lock Wallet</h5>
                      <p className="text-gray-400 text-sm">Clear wallet from memory (requires re-authentication)</p>
                    </div>
                    <button
                      onClick={disconnect}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Lock
                    </button>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-red-400 font-medium">Delete Wallet</h5>
                        <p className="text-gray-400 text-sm">Permanently delete all wallet data (irreversible)</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to permanently delete your wallet? This action cannot be undone!')) {
                            clearWallet();
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isWebAuthnSupported) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-md p-8 bg-gray-800 rounded-lg border border-gray-700 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">WebAuthn Not Supported</h2>
          <p className="text-gray-300 mb-6">
            Your browser doesn't support WebAuthn authentication, which is required for the secure wallet system.
          </p>
          <p className="text-gray-400 text-sm">
            Please use a modern browser like Chrome, Firefox, Safari, or Edge to access the wallet.
          </p>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-md p-8 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center mb-6">
            <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Create Secure Wallet</h2>
            <p className="text-gray-400">
              Create a new WebAuthn-protected wallet with biometric authentication
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Shield className="w-5 h-5" />
              )}
              Create Wallet
            </button>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h4 className="text-blue-300 font-medium mb-2">Security Features:</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>✓ Biometric authentication (fingerprint/face ID)</li>
                <li>✓ AES-GCM encrypted storage</li>
                <li>✓ No seed phrases to remember</li>
                <li>✓ Device-bound security</li>
                <li>✓ Auto-timeout protection</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-md p-8 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center mb-6">
            <Shield className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Authenticate Wallet</h2>
            <p className="text-gray-400">
              Use your biometric authentication to unlock your wallet
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleAuthenticate}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Shield className="w-5 h-5" />
              )}
              Authenticate
            </button>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return renderContent();
}