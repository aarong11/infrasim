'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  User, 
  Shield, 
  X, 
  Send, 
  Plus, 
  History, 
  Settings, 
  Copy, 
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Eye,
  EyeOff,
  RefreshCw,
  QrCode,
  Download
} from 'lucide-react';
import { useWalletManager } from '../hooks/useWalletManager';

interface WebAuthnWalletPopoutProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Token {
  symbol: string;
  name: string;
  balance: string;
  address: string;
  decimals: number;
  logo?: string;
}

export const WebAuthnWalletPopout: React.FC<WebAuthnWalletPopoutProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { 
    activeWallet, 
    isConnected,
    createWebAuthnWallet,
    authenticateWebAuthn,
    disconnectWallet,
    isWebAuthnSupported,
    canCreateWebAuthn,
    canAuthenticateWebAuthn,
    isWebAuthnRegistered,
    sendTransaction,
    signMessage,
    updateBalance 
  } = useWalletManager();
  
  const [activeTab, setActiveTab] = useState<'assets' | 'activity' | 'send'>('assets');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Send transaction state
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    gasLimit: '21000',
    gasPrice: '20',
    data: ''
  });
  const [isSending, setIsSending] = useState(false);
  
  // Token management state
  const [tokens, setTokens] = useState<Token[]>([
    {
      symbol: 'ETH',
      name: 'Ethereum',
      balance: activeWallet?.balance || '0.00',
      address: 'native',
      decimals: 18
    }
  ]);
  const [showAddToken, setShowAddToken] = useState(false);
  const [newToken, setNewToken] = useState({
    address: '',
    symbol: '',
    decimals: 18
  });

  // Activity/History state
  const [transactions, setTransactions] = useState([
    // Mock data - replace with real transaction history
    {
      id: '1',
      type: 'send',
      to: '0x742d35Cc6634C0532925a3b8D69B0f000000000',
      amount: '0.1',
      symbol: 'ETH',
      status: 'confirmed',
      timestamp: Date.now() - 3600000,
      hash: '0xabc123...'
    }
  ]);

  // Update ETH balance when activeWallet changes
  useEffect(() => {
    if (activeWallet?.balance) {
      setTokens(prev => prev.map(token => 
        token.symbol === 'ETH' 
          ? { ...token, balance: activeWallet.balance }
          : token
      ));
    }
  }, [activeWallet?.balance]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      if (canCreateWebAuthn) {
        await createWebAuthnWallet();
      } else if (canAuthenticateWebAuthn) {
        await authenticateWebAuthn();
      } else if (isWebAuthnSupported) {
        setError('WebAuthn data may be corrupted. Click "Reset Wallet Data" below to start fresh.');
        return;
      } else {
        throw new Error('WebAuthn is not available on this device');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Failed to connect wallet:', err);
      
      if (canAuthenticateWebAuthn && errorMessage.includes('authentication failed')) {
        setError(errorMessage + ' - Your WebAuthn data may be corrupted. Try resetting wallet data below.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleResetWalletData = () => {
    try {
      const storageKeys = [
        'webauthn_credential_id',
        'webauthn_encrypted_salt', 
        'encrypted_wallet_data',
        'salt_encryption_iv',
        'device_fingerprint',
        'device_fingerprint_version',
        'pbkdf2_salt_private_key',
        'pbkdf2_salt_mnemonic'
      ];
      
      storageKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      setError(null);
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset wallet data:', err);
      setError('Failed to reset wallet data. Please try clearing your browser data manually.');
    }
  };

  const handleDisconnect = async () => {
    if (activeWallet) {
      try {
        await disconnectWallet(activeWallet.id);
      } catch (err) {
        console.error('Failed to disconnect wallet:', err);
      }
    }
  };

  const handleSendTransaction = async () => {
    if (!sendForm.to || !sendForm.amount) {
      setError('Please fill in recipient address and amount');
      return;
    }

    setIsSending(true);
    try {
      const txHash = await sendTransaction(
        sendForm.to,
        sendForm.amount
      );
      
      // Add to transaction history
      setTransactions(prev => [{
        id: Date.now().toString(),
        type: 'send',
        to: sendForm.to,
        amount: sendForm.amount,
        symbol: 'ETH',
        status: 'pending',
        timestamp: Date.now(),
        hash: txHash
      }, ...prev]);

      // Clear form
      setSendForm({ to: '', amount: '', gasLimit: '21000', gasPrice: '20', data: '' });
      setActiveTab('activity');
      await handleRefreshBalance();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsSending(false);
    }
  };

  const handleRefreshBalance = async () => {
    if (!activeWallet) return;
    setIsRefreshing(true);
    try {
      await updateBalance(activeWallet.id);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddToken = () => {
    if (!newToken.address || !newToken.symbol) {
      setError('Please fill in token address and symbol');
      return;
    }

    const token: Token = {
      address: newToken.address,
      symbol: newToken.symbol.toUpperCase(),
      name: newToken.symbol,
      balance: '0.00',
      decimals: newToken.decimals
    };

    setTokens(prev => [...prev, token]);
    setNewToken({ address: '', symbol: '', decimals: 18 });
    setShowAddToken(false);
    setError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const openInExplorer = (address: string) => {
    // Using Etherscan for mainnet - you can change this to your preferred explorer
    const explorerUrl = `https://etherscan.io/address/${address}`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  const openTxInExplorer = (txHash: string) => {
    const explorerUrl = `https://etherscan.io/tx/${txHash}`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popout - Full height wallet */}
      <div className="fixed top-16 left-6 bottom-6 w-[480px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[9999] flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🔐</span>
              <div>
                <h3 className="text-lg font-semibold text-white">WebAuthn Secure Wallet</h3>
                <p className="text-sm text-gray-400">
                  {isConnected ? 'Connected & Authenticated' : 'Not connected'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected && (
                <button
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
                  title="Refresh balance"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {isConnected && activeWallet ? (
          <>
            {/* Account Info */}
            <div className="p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  <span className="text-base font-medium text-white">Account</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => copyToClipboard(activeWallet.address)}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-gray-700"
                    title="Copy address"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openInExplorer(activeWallet.address)}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-gray-700"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-300 font-mono break-all">
                  {activeWallet.address}
                </p>
              </div>
              
              {/* Balance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-green-400" />
                  <span className="text-base font-medium text-white">Balance</span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xl font-semibold text-green-400">
                  {showBalance ? `${activeWallet.balance || '0.00'} ETH` : '••••'}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-700 flex-shrink-0">
              <button
                onClick={() => setActiveTab('assets')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'assets'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Assets
              </button>
              <button
                onClick={() => setActiveTab('send')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'send'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Send
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Activity
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Assets Tab */}
              {activeTab === 'assets' && (
                <div className="p-6 space-y-4">
                  {/* Quick Actions */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <button 
                      onClick={() => setActiveTab('send')}
                      className="flex flex-col items-center space-y-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Send className="w-6 h-6 text-cyan-400" />
                      <span className="text-sm text-white">Send</span>
                    </button>
                    <button className="flex flex-col items-center space-y-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                      <Download className="w-6 h-6 text-green-400" />
                      <span className="text-sm text-white">Receive</span>
                    </button>
                    <button className="flex flex-col items-center space-y-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                      <QrCode className="w-6 h-6 text-purple-400" />
                      <span className="text-sm text-white">QR Code</span>
                    </button>
                  </div>

                  {/* Token List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-medium text-white">Your Assets</h4>
                      <button
                        onClick={() => setShowAddToken(true)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors p-2 rounded-lg hover:bg-gray-800"
                        title="Add token"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {tokens.map((token, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                            <Coins className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-base font-medium text-white">{token.symbol}</p>
                            <p className="text-sm text-gray-400">{token.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-medium text-white">
                            {showBalance ? `${parseFloat(token.balance).toFixed(4)}` : '••••'}
                          </p>
                          <p className="text-sm text-gray-400">{token.symbol}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Token Form */}
                  {showAddToken && (
                    <div className="mt-6 p-4 bg-gray-800/50 rounded-lg space-y-4">
                      <h5 className="text-base font-medium text-white">Add Custom Token</h5>
                      <input
                        type="text"
                        placeholder="Token Contract Address"
                        value={newToken.address}
                        onChange={(e) => setNewToken(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Symbol"
                          value={newToken.symbol}
                          onChange={(e) => setNewToken(prev => ({ ...prev, symbol: e.target.value }))}
                          className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                        />
                        <input
                          type="number"
                          placeholder="Decimals"
                          value={newToken.decimals}
                          onChange={(e) => setNewToken(prev => ({ ...prev, decimals: parseInt(e.target.value) || 18 }))}
                          className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleAddToken}
                          className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Add Token
                        </button>
                        <button
                          onClick={() => setShowAddToken(false)}
                          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Send Tab */}
              {activeTab === 'send' && (
                <div className="p-6 space-y-6">
                  <h4 className="text-lg font-medium text-white">Send Transaction</h4>
                  
                  {/* Send Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">To Address</label>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={sendForm.to}
                        onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount (ETH)</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="0.0"
                        value={sendForm.amount}
                        onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {/* Advanced Options */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors py-2">
                        Advanced Options
                      </summary>
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Gas Limit</label>
                            <input
                              type="number"
                              value={sendForm.gasLimit}
                              onChange={(e) => setSendForm(prev => ({ ...prev, gasLimit: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Gas Price (Gwei)</label>
                            <input
                              type="number"
                              value={sendForm.gasPrice}
                              onChange={(e) => setSendForm(prev => ({ ...prev, gasPrice: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Data (Optional)</label>
                          <textarea
                            placeholder="0x..."
                            value={sendForm.data}
                            onChange={(e) => setSendForm(prev => ({ ...prev, data: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-cyan-400 h-20 resize-none"
                          />
                        </div>
                      </div>
                    </details>

                    {error && (
                      <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={handleSendTransaction}
                      disabled={isSending || !sendForm.to || !sendForm.amount}
                      className={`w-full py-4 rounded-lg text-sm font-medium transition-colors ${
                        isSending || !sendForm.to || !sendForm.amount
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                      }`}
                    >
                      {isSending ? 'Sending...' : 'Send Transaction'}
                    </button>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Transaction History</h4>
                  
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-base">No transactions yet</p>
                      <p className="text-gray-500 text-sm mt-2">Your transaction history will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === 'send' ? 'bg-red-900/30' : 'bg-green-900/30'
                              }`}>
                                {tx.type === 'send' ? 
                                  <ArrowUpRight className="w-5 h-5 text-red-400" /> :
                                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                                }
                              </div>
                              <div>
                                <p className="text-base font-medium text-white capitalize">{tx.type}</p>
                                <p className="text-sm text-gray-400">
                                  {tx.type === 'send' ? 'To' : 'From'}: {formatAddress(tx.to)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-base font-medium ${
                                tx.type === 'send' ? 'text-red-400' : 'text-green-400'
                              }`}>
                                {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.symbol}
                              </p>
                              <p className={`text-sm ${
                                tx.status === 'confirmed' ? 'text-green-400' :
                                tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {tx.status}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-between items-center">
                            <p className="text-sm text-gray-500">{formatTime(tx.timestamp)}</p>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => copyToClipboard(tx.hash)}
                                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                Copy Hash
                              </button>
                              <button
                                onClick={() => openTxInExplorer(tx.hash)}
                                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                View Explorer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-700 p-4 flex-shrink-0">
              <div className="flex space-x-3">
                <button className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Not connected state */
          <div className="p-6 flex-1 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              {/* Wallet Description */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <span className="text-4xl">🔐</span>
                  <h3 className="text-xl font-semibold text-white">WebAuthn Secure Wallet</h3>
                </div>
                <p className="text-gray-400 text-base leading-relaxed mb-4">
                  Ultra-secure wallet using biometric authentication and hardware security keys. 
                  No seed phrases to remember, phishing-resistant authentication.
                </p>
                
                {/* Key Features */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded">
                    Biometric Auth
                  </span>
                  <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded">
                    Hardware Security
                  </span>
                  <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded">
                    No Seed Phrases
                  </span>
                </div>
              </div>

              {/* WebAuthn Support Check */}
              {!isWebAuthnSupported && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm">
                    WebAuthn is not supported on this device/browser
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Connect Button */}
              <button
                onClick={handleConnect}
                disabled={isConnecting || !isWebAuthnSupported}
                className={`w-full py-4 px-6 rounded-lg transition-colors text-base font-medium flex items-center justify-center space-x-3 ${
                  isWebAuthnSupported
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Shield className="w-5 h-5" />
                <span>
                  {isConnecting 
                    ? 'Connecting...' 
                    : isWebAuthnSupported 
                      ? canCreateWebAuthn 
                        ? 'Create WebAuthn Wallet'
                        : canAuthenticateWebAuthn
                        ? 'Authenticate WebAuthn Wallet'
                        : 'Connect to WebAuthn Secure Wallet'
                      : 'WebAuthn Unavailable'
                  }
                </span>
              </button>

              {/* Reset Button */}
              {(error || (isWebAuthnSupported && !canCreateWebAuthn && !canAuthenticateWebAuthn)) && (
                <button
                  onClick={handleResetWalletData}
                  className="w-full py-3 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 rounded-lg transition-colors text-sm font-medium"
                >
                  Reset Wallet Data
                </button>
              )}

              {/* Help Text */}
              <div className="text-sm text-gray-500 space-y-2">
                {canCreateWebAuthn && (
                  <p>First time? Click connect to create your secure wallet.</p>
                )}
                {canAuthenticateWebAuthn && (
                  <p>Returning user? Your biometric data will authenticate you.</p>
                )}
                {!canCreateWebAuthn && !canAuthenticateWebAuthn && isWebAuthnSupported && (
                  <p>WebAuthn data exists but cannot be used. Try resetting below.</p>
                )}
                {/* Debug info in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-800 rounded text-xs">
                    <p>Debug: WebAuthn Supported: {isWebAuthnSupported ? 'Yes' : 'No'}</p>
                    <p>Can Create: {canCreateWebAuthn ? 'Yes' : 'No'}</p>
                    <p>Can Authenticate: {canAuthenticateWebAuthn ? 'Yes' : 'No'}</p>
                    <p>Is Registered: {isWebAuthnRegistered ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
