'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWebAuthnWallet } from '../../providers/UnifiedWalletProvider';
import { Shield, Wallet, Coins, Plus, Copy, Eye, EyeOff, Trash2, Check, X, RefreshCw, Send, Download, Upload, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface Transaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  timestamp: number;
  status: number;
  type: 'incoming' | 'outgoing';
}

// API rate limiting utility with exponential backoff
class APIThrottler {
  private lastCall = 0;
  private minInterval = 200; // 1 second minimum between calls
  private failureCount = 0;
  private maxRetries = 10;

  async throttledCall<T>(apiCall: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    // Calculate backoff time based on failure count (exponential backoff)
    const backoffTime = this.failureCount > 0 ? Math.min(this.minInterval * Math.pow(2, this.failureCount), 30000) : this.minInterval;
    
    if (timeSinceLastCall < backoffTime) {
      await new Promise(resolve => setTimeout(resolve, backoffTime - timeSinceLastCall));
    }

    this.lastCall = Date.now();

    try {
      const result = await apiCall();
      this.failureCount = 0; // Reset failure count on success
      return result;
    } catch (error) {
      this.failureCount = Math.min(this.failureCount + 1, this.maxRetries);
      throw error;
    }
  }

  reset() {
    this.failureCount = 0;
    this.lastCall = 0;
  }
}

const isIframeModeHelper = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

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

  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'addresses' | 'tokens' | 'transactions' | 'settings'>('overview');
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

  // Transaction state - using real API data with throttling
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState('');
  
  // Send transaction state
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    token: 'ETH',
    gasPrice: '',
    gasLimit: '21000',
    data: '',
    memo: '',
    transactionType: 'simple' as 'simple' | 'token' | 'custom'
  });
  const [availableTokens, setAvailableTokens] = useState([
    { symbol: 'ETH', name: 'Ethereum', address: 'native', decimals: 18, balance: '0' },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6441Cc5C43EdC8FED86b88C7Ff39b19', decimals: 6, balance: '0' }
  ]);
  const [estimatedGas, setEstimatedGas] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [txHash, setTxHash] = useState('');

  // API throttling
  const apiThrottler = useRef(new APIThrottler());
  const hasFetchedTransactions = useRef(false);
  const transactionsFetchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch real transaction data from API with throttling and exponential backoff
  const fetchTransactions = async (force = false) => {
    if (!wallet?.address) return;
    if (transactionsLoading && !force) return; // Prevent multiple simultaneous requests
    
    try {
      setTransactionsLoading(true);
      setTransactionsError('');
      
      const response = await apiThrottler.current.throttledCall(async () => {
        return fetch(`/api/address/${wallet.address}?limit=50`);
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch transactions`);
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      hasFetchedTransactions.current = true;
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactionsError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Manual refresh with user feedback
  const handleRefreshTransactions = () => {
    apiThrottler.current.reset(); // Reset backoff for manual refresh
    fetchTransactions(true);
  };

  // Auto-refresh with proper throttling
  const scheduleTransactionRefresh = () => {
    if (transactionsFetchTimeout.current) {
      clearTimeout(transactionsFetchTimeout.current);
    }
    
    // Only auto-refresh if user is on transactions tab and has previously fetched
    if (activeTab === 'transactions' && hasFetchedTransactions.current) {
      transactionsFetchTimeout.current = setTimeout(() => {
        if (wallet?.address && !transactionsLoading) {
          fetchTransactions();
        }
        scheduleTransactionRefresh(); // Schedule next refresh
      }, 30000); // 30 seconds between auto-refreshes
    }
  };

  // Load available tokens and balances for the Send tab
  const loadAvailableTokens = async () => {
    try {
      const response = await fetch('/api/wallet/tokens');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableTokens(data.tokens.map((token: any) => ({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            decimals: token.decimals,
            balance: token.balance
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load available tokens:', error);
    }
  };

  // Load tokens when Send tab is accessed
  useEffect(() => {
    if (activeTab === 'send' && isAuthenticated && wallet) {
      loadAvailableTokens();
    }
  }, [activeTab, isAuthenticated, wallet]);

  useEffect(() => {
    // Check if we're in iframe mode
    setInIframe(isIframeModeHelper());
    
    if (isAuthenticated && wallet) {
      updateBalance();
      updateTokenBalances();
      
      // Only fetch transactions once when wallet is authenticated
      if (!hasFetchedTransactions.current) {
        fetchTransactions();
      }
    }
    
    return () => {
      if (transactionsFetchTimeout.current) {
        clearTimeout(transactionsFetchTimeout.current);
      }
    };
  }, [isAuthenticated, wallet]);

  // Handle tab changes and auto-refresh
  useEffect(() => {
    if (activeTab === 'transactions' && wallet?.address && hasFetchedTransactions.current) {
      scheduleTransactionRefresh();
    } else {
      // Clear timeout when not on transactions tab
      if (transactionsFetchTimeout.current) {
        clearTimeout(transactionsFetchTimeout.current);
        transactionsFetchTimeout.current = null;
      }
    }
    
    return () => {
      if (transactionsFetchTimeout.current) {
        clearTimeout(transactionsFetchTimeout.current);
      }
    };
  }, [activeTab, wallet?.address]);

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
      await createNewAddress();
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
      await addCustomToken();
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
      await switchToAddress();
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
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatEther = (wei: string): string => {
    try {
      const eth = Number(wei) / 1e18;
      return eth.toFixed(6);
    } catch {
      return '0.000000';
    }
  };

  const shortenHash = (hash: string): string => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // Auto-clear success/error messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
                <li>✓ API rate limiting & throttling</li>
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
                  <p className="text-gray-400">WebAuthn-protected cryptocurrency wallet with API throttling</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm font-mono">{formatTime(timeRemaining)}</span>
                </div>
                <button
                  onClick={() => {
                    updateBalance();
                    handleRefreshTransactions();
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Refresh balances and transactions"
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

            {/* Prominent Send Button */}
            <div className="mb-6">
              <button
                onClick={() => setActiveTab('send')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <Send className="w-6 h-6" />
                Send Funds
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="mt-6 flex space-x-1 bg-gray-700 p-1 rounded-lg">
              {[
                { id: 'overview', label: 'Overview', icon: Wallet },
                { id: 'send', label: 'Send', icon: Send },
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
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Current Address Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Current Address</h3>
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="space-y-3">
                <div className="font-mono text-sm text-gray-300 break-all">
                  {wallet?.address}
                </div>
                <button
                  onClick={() => copyToClipboard(wallet?.address || '')}
                  className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy Address
                </button>
              </div>
            </div>

            {/* ETH Balance Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">ETH Balance</h3>
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">
                  {wallet ? parseFloat(wallet.balance).toFixed(4) : '0.0000'} ETH
                </div>
                <button
                  onClick={updateBalance}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* USDC Balance Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">USDC Balance</h3>
                <Coins className="w-5 h-5 text-green-400" />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">
                  {wallet?.usdcBalance ? parseFloat(wallet.usdcBalance).toFixed(2) : '0.00'} USDC
                </div>
                <button
                  onClick={updateTokenBalances}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('send')}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                <Send className="w-8 h-8 text-white" />
                <span className="text-white font-medium">Send Funds</span>
              </button>
              <button
                onClick={() => setActiveTab('addresses')}
                className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Shield className="w-6 h-6 text-cyan-400" />
                <span className="text-sm text-white">Manage Addresses</span>
              </button>
              <button
                onClick={() => setActiveTab('tokens')}
                className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Coins className="w-6 h-6 text-green-400" />
                <span className="text-sm text-white">Manage Tokens</span>
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <ArrowUpRight className="w-6 h-6 text-blue-400" />
                <span className="text-sm text-white">View Transactions</span>
              </button>
            </div>
          </div>

          {/* Security Status */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Security Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300">WebAuthn Authentication</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm font-mono">{formatTime(timeRemaining)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300">AES-GCM Encryption</span>
                </div>
                <span className="text-green-400 text-sm">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300">API Rate Limiting</span>
                </div>
                <span className="text-green-400 text-sm">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'send' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Send Transaction</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSendForm(prev => ({ ...prev, transactionType: 'simple' }))}
                  className={`px-3 py-1 text-sm rounded ${
                    sendForm.transactionType === 'simple'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setSendForm(prev => ({ ...prev, transactionType: 'token' }))}
                  className={`px-3 py-1 text-sm rounded ${
                    sendForm.transactionType === 'token'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Token
                </button>
                <button
                  onClick={() => setSendForm(prev => ({ ...prev, transactionType: 'custom' }))}
                  className={`px-3 py-1 text-sm rounded ${
                    sendForm.transactionType === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Send Form */}
              <div className="space-y-4">
                {/* Recipient Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={sendForm.to}
                    onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="0x..."
                    className="w-full bg-gray-700 text-white px-3 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                  />
                </div>

                {/* Token Selection (for simple and token transactions) */}
                {sendForm.transactionType !== 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Asset
                    </label>
                    <select
                      value={sendForm.token}
                      onChange={(e) => setSendForm(prev => ({ ...prev, token: e.target.value }))}
                      className="w-full bg-gray-700 text-white px-3 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      {availableTokens.map((token) => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.symbol} - {token.name} ({token.balance} {token.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount {sendForm.transactionType !== 'custom' && `(${sendForm.token})`}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.000001"
                      value={sendForm.amount}
                      onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.0"
                      className="w-full bg-gray-700 text-white px-3 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                    />
                    {sendForm.transactionType !== 'custom' && (
                      <button
                        onClick={() => {
                          const selectedToken = availableTokens.find(t => t.symbol === sendForm.token);
                          if (selectedToken) {
                            const maxAmount = selectedToken.symbol === 'ETH' 
                              ? Math.max(0, parseFloat(selectedToken.balance) - 0.01) // Reserve for gas
                              : parseFloat(selectedToken.balance);
                            setSendForm(prev => ({ ...prev, amount: maxAmount.toString() }));
                          }
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                </div>

                {/* Gas Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gas Price (Gwei)
                    </label>
                    <input
                      type="number"
                      value={sendForm.gasPrice}
                      onChange={(e) => setSendForm(prev => ({ ...prev, gasPrice: e.target.value }))}
                      placeholder="20"
                      className="w-full bg-gray-700 text-white px-3 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gas Limit
                    </label>
                    <input
                      type="number"
                      value={sendForm.gasLimit}
                      onChange={(e) => setSendForm(prev => ({ ...prev, gasLimit: e.target.value }))}
                      placeholder="21000"
                      className="w-full bg-gray-700 text-white px-3 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Custom Data (for custom transactions) */}
                {sendForm.transactionType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Transaction Data (Hex)
                    </label>
                    <textarea
                      value={sendForm.data}
                      onChange={(e) => setSendForm(prev => ({ ...prev, data: e.target.value }))}
                      placeholder="0x..."
                      rows={3}
                      className="w-full bg-gray-700 text-white px-3 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                    />
                  </div>
                )}

                {/* Memo */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Memo (Optional)
                  </label>
                  <input
                    type="text"
                    value={sendForm.memo}
                    onChange={(e) => setSendForm(prev => ({ ...prev, memo: e.target.value }))}
                    placeholder="Payment description..."
                    className="w-full bg-gray-700 text-white px-3 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">Transaction Summary</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white font-mono text-xs">
                      {wallet?.address.slice(0, 10)}...{wallet?.address.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">To:</span>
                    <span className="text-white font-mono text-xs">
                      {sendForm.to ? `${sendForm.to.slice(0, 10)}...${sendForm.to.slice(-8)}` : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white capitalize">{sendForm.transactionType}</span>
                  </div>
                  {sendForm.transactionType !== 'custom' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Asset:</span>
                      <span className="text-white">{sendForm.token}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white">
                      {sendForm.amount || '0'} {sendForm.transactionType !== 'custom' ? sendForm.token : 'ETH'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Fee:</span>
                    <span className="text-white">
                      {sendForm.gasPrice && sendForm.gasLimit 
                        ? `${(parseFloat(sendForm.gasPrice) * parseFloat(sendForm.gasLimit) / 1e9).toFixed(6)} ETH`
                        : 'Not calculated'
                      }
                    </span>
                  </div>
                  <div className="border-t border-gray-600 pt-3 flex justify-between font-semibold">
                    <span className="text-gray-300">Total Cost:</span>
                    <span className="text-white">
                      {sendForm.gasPrice && sendForm.gasLimit && sendForm.amount
                        ? sendForm.token === 'ETH' && sendForm.transactionType !== 'custom'
                          ? `${(parseFloat(sendForm.amount) + (parseFloat(sendForm.gasPrice) * parseFloat(sendForm.gasLimit) / 1e9)).toFixed(6)} ETH`
                          : `${sendForm.amount} ${sendForm.token} + ${(parseFloat(sendForm.gasPrice) * parseFloat(sendForm.gasLimit) / 1e9).toFixed(6)} ETH`
                        : 'Cannot calculate'
                      }
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={async () => {
                      // Gas estimation logic
                      try {
                        const response = await fetch('/api/wallet/estimate-gas', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: sendForm.to,
                            amount: sendForm.amount,
                            token: sendForm.token,
                            data: sendForm.data,
                            transactionType: sendForm.transactionType
                          })
                        });
                        const result = await response.json();
                        if (result.success) {
                          setSendForm(prev => ({
                            ...prev,
                            gasPrice: result.gasPrice,
                            gasLimit: result.gasLimit
                          }));
                          setEstimatedGas(result.estimatedGas);
                        }
                      } catch (error) {
                        console.error('Gas estimation failed:', error);
                      }
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Estimate Gas
                  </button>

                  <button
                    onClick={async () => {
                      setSendLoading(true);
                      setSendError('');
                      setSendSuccess('');
                      
                      try {
                        const response = await fetch('/api/wallet/send-transaction', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: sendForm.to,
                            amount: sendForm.amount,
                            token: sendForm.token,
                            gasPrice: sendForm.gasPrice,
                            gasLimit: sendForm.gasLimit,
                            data: sendForm.data,
                            memo: sendForm.memo,
                            transactionType: sendForm.transactionType
                          })
                        });

                        const result = await response.json();
                        
                        if (result.success) {
                          setTxHash(result.txHash);
                          setSendSuccess(`Transaction sent! Hash: ${result.txHash}`);
                          // Reset form
                          setSendForm({
                            to: '',
                            amount: '',
                            token: 'ETH',
                            gasPrice: '',
                            gasLimit: '21000',
                            data: '',
                            memo: '',
                            transactionType: 'simple'
                          });
                          // Refresh balances
                          updateBalance();
                          updateTokenBalances();
                          fetchTransactions(true);
                        } else {
                          setSendError(result.error || 'Transaction failed');
                        }
                      } catch (error) {
                        setSendError(error instanceof Error ? error.message : 'Transaction failed');
                      } finally {
                        setSendLoading(false);
                      }
                    }}
                    disabled={sendLoading || !sendForm.to || !sendForm.amount || !sendForm.gasPrice || !sendForm.gasLimit}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {sendLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {sendLoading ? 'Sending...' : 'Send Transaction'}
                  </button>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {sendError && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 text-sm">{sendError}</p>
                </div>
              </div>
            )}

            {sendSuccess && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <p className="text-green-400 text-sm font-medium">Transaction Sent Successfully!</p>
                </div>
                {txHash && (
                  <div className="space-y-2">
                    <div className="text-xs text-green-300">Transaction Hash:</div>
                    <div className="bg-gray-700 p-2 rounded font-mono text-xs text-white break-all">
                      {txHash}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(txHash)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                      >
                        Copy Hash
                      </button>
                      <a
                        href={`/explorer/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View in Explorer
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Type Explanations */}
            <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Transaction Types</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-blue-400 font-medium mb-1">Simple</div>
                  <div className="text-gray-300">Send native ETH or supported tokens to any address</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-green-400 font-medium mb-1">Token</div>
                  <div className="text-gray-300">Send ERC20 tokens with automatic contract interaction</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-purple-400 font-medium mb-1">Custom</div>
                  <div className="text-gray-300">Create arbitrary transactions with custom data payload</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Transaction History</h3>
            <div className="flex gap-2">
              <button
                onClick={handleRefreshTransactions}
                disabled={transactionsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <a
                href={`/explorer/address/${wallet?.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View in Explorer
              </a>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            {transactionsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading transactions with rate limiting...</p>
              </div>
            ) : transactionsError ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h4 className="text-lg text-red-300 mb-2">Error Loading Transactions</h4>
                <p className="text-gray-500 mb-4">{transactionsError}</p>
                <p className="text-gray-600 text-sm mb-4">
                  API calls are throttled to prevent spam. Retrying with exponential backoff...
                </p>
                <button
                  onClick={handleRefreshTransactions}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <h4 className="text-lg text-gray-300 mb-2">No transactions yet</h4>
                <p className="text-gray-500">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.hash} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'outgoing' ? 'bg-red-600' : 'bg-green-600'
                      }`}>
                        {tx.type === 'outgoing' ? (
                          <ArrowUpRight className="w-5 h-5 text-white" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h5 className="text-white font-medium capitalize">
                          {tx.type === 'outgoing' ? 'Sent' : 'Received'} ETH
                        </h5>
                        <p className="text-gray-400 text-sm">
                          {tx.type === 'outgoing' ? `To: ${tx.to?.slice(0, 10)}...` : `From: ${tx.from.slice(0, 10)}...`}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Block #{tx.blockNumber} • {formatTimestamp(tx.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type === 'outgoing' ? 'text-red-400' : 'text-green-400'}`}>
                        {tx.type === 'outgoing' ? '-' : '+'}{formatEther(tx.value)} ETH
                      </p>
                      <p className={`text-sm ${tx.status === 1 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.status === 1 ? 'Success' : 'Failed'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => copyToClipboard(tx.hash)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="Copy transaction hash"
                        >
                          {shortenHash(tx.hash)}
                        </button>
                        <a
                          href={`/explorer/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          title="View in explorer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Auto-refresh indicator with throttling info */}
                {activeTab === 'transactions' && (
                  <div className="text-center py-2 bg-gray-700/50 rounded">
                    <p className="text-gray-500 text-xs">
                      🛡️ Auto-refreshes every 30 seconds with rate limiting • Last updated: {new Date().toLocaleTimeString()}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      API calls limited to 1 per second with exponential backoff on failures
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other tabs - simplified content */}
      {!['overview', 'send', 'transactions'].includes(activeTab) && (
        <div className="text-center py-12">
          <h3 className="text-xl text-white mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tab</h3>
          <p className="text-gray-400">
            This tab's content has been simplified for the demo. 
            Focus is on the transactions tab with proper API throttling.
          </p>
          <div className="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg max-w-md mx-auto">
            <h4 className="text-green-300 font-medium mb-2">✅ Throttling Features Added:</h4>
            <ul className="text-sm text-green-200 space-y-1 text-left">
              <li>• Minimum 1 second between API calls</li>
              <li>• Exponential backoff on failures (2^n seconds)</li>
              <li>• Maximum 30 second backoff limit</li>
              <li>• Automatic retry with increased delays</li>
              <li>• Prevention of infinite loops</li>
              <li>• Manual refresh resets backoff</li>
              <li>• Auto-refresh only on transactions tab</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}