'use client';

import React, { useState } from 'react';
import { Plus, Wallet, Coins, Trash2, Copy, Eye, EyeOff, Check, X } from 'lucide-react';
import { useWebAuthnWallet } from './WebAuthnWalletProvider';

export const WalletManagerComponent: React.FC = () => {
  const { 
    wallet,
    isAuthenticated,
    createNewAddress,
    switchToAddress,
    addCustomToken,
    removeCustomToken,
    updateTokenBalances
  } = useWebAuthnWallet();

  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [showNewTokenForm, setShowNewTokenForm] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newToken, setNewToken] = useState({
    address: '',
    symbol: '',
    name: '',
    decimals: 18,
    enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrivateKeys, setShowPrivateKeys] = useState<Record<string, boolean>>({});

  const handleCreateAddress = async () => {
    if (!newAddressLabel.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      await createNewAddress(newAddressLabel);
      setNewAddressLabel('');
      setShowNewAddressForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create address');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToken = async () => {
    if (!newToken.address || !newToken.symbol || !newToken.name) return;
    
    try {
      setLoading(true);
      setError('');
      await addCustomToken(newToken);
      setNewToken({ address: '', symbol: '', name: '', decimals: 18, enabled: true });
      setShowNewTokenForm(false);
      await updateTokenBalances();
    } catch (err: any) {
      setError(err.message || 'Failed to add token');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAddress = async (addressId: string) => {
    try {
      setLoading(true);
      await switchToAddress(addressId);
    } catch (err: any) {
      setError(err.message || 'Failed to switch address');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const togglePrivateKeyVisibility = (addressId: string) => {
    setShowPrivateKeys(prev => ({
      ...prev,
      [addressId]: !prev[addressId]
    }));
  };

  if (!isAuthenticated || !wallet) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-center text-gray-400">
          Please authenticate your wallet to access management features
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Address Management */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-cyan-400" />
            Wallet Addresses
          </h3>
          <button
            onClick={() => setShowNewAddressForm(true)}
            className="flex items-center gap-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Address
          </button>
        </div>

        {/* Main Address */}
        <div className="space-y-3">
          <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-medium">Primary Address</span>
                  <span className="px-2 py-1 bg-green-800 text-green-200 text-xs rounded">Current</span>
                </div>
                <div className="font-mono text-sm text-gray-300 mt-1">{wallet.address}</div>
                <div className="text-sm text-gray-400">Balance: {parseFloat(wallet.balance).toFixed(4)} ETH</div>
              </div>
              <button
                onClick={() => copyToClipboard(wallet.address)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Copy address"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Additional Addresses */}
          {wallet.addresses?.map((addr) => (
            <div key={addr.id} className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="px-2 py-1 bg-blue-800 text-blue-200 text-xs rounded">Default</span>
                    )}
                  </div>
                  <div className="font-mono text-sm text-gray-300 mt-1">{addr.address}</div>
                  <div className="text-sm text-gray-400">Balance: {parseFloat(addr.balance).toFixed(4)} ETH</div>
                  
                  {/* Private Key Toggle */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => togglePrivateKeyVisibility(addr.id)}
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                      title="Toggle private key visibility"
                    >
                      {showPrivateKeys[addr.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    {showPrivateKeys[addr.id] && (
                      <>
                        <input
                          type="text"
                          value={addr.privateKey}
                          readOnly
                          className="flex-1 p-1 text-xs bg-gray-900/50 border border-gray-600 rounded text-gray-200 font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(addr.privateKey)}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="Copy private key"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleSwitchAddress(addr.id)}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    Switch
                  </button>
                  <button
                    onClick={() => copyToClipboard(addr.address)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    title="Copy address"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* New Address Form */}
        {showNewAddressForm && (
          <div className="mt-4 p-4 bg-gray-700 border border-gray-600 rounded-lg">
            <h4 className="text-white font-medium mb-3">Create New Address</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Address Label</label>
                <input
                  type="text"
                  value={newAddressLabel}
                  onChange={(e) => setNewAddressLabel(e.target.value)}
                  placeholder="e.g., Trading Account, DAO Operations"
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateAddress}
                  disabled={loading || !newAddressLabel.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Create
                </button>
                <button
                  onClick={() => setShowNewAddressForm(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Token Management */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Coins className="w-5 h-5 mr-2 text-yellow-400" />
            Custom Tokens
          </h3>
          <button
            onClick={() => setShowNewTokenForm(true)}
            className="flex items-center gap-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Token
          </button>
        </div>

        {/* Default Tokens */}
        <div className="space-y-3">
          <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-400 font-medium">USDC (Default)</div>
                <div className="text-sm text-gray-400">
                  Balance: {wallet.usdcBalance ? parseFloat(wallet.usdcBalance).toFixed(2) : '0.00'} USDC
                </div>
              </div>
              <span className="px-2 py-1 bg-blue-800 text-blue-200 text-xs rounded">Built-in</span>
            </div>
          </div>

          {/* Custom Tokens */}
          {wallet.customTokens?.map((token) => (
            <div key={token.id} className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{token.name} ({token.symbol})</div>
                  <div className="font-mono text-sm text-gray-300 mt-1">{token.address}</div>
                  <div className="text-sm text-gray-400">
                    Balance: {token.balance ? parseFloat(token.balance).toFixed(6) : '0.000000'} {token.symbol}
                  </div>
                </div>
                <button
                  onClick={() => removeCustomToken(token.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Remove token"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* New Token Form */}
        {showNewTokenForm && (
          <div className="mt-4 p-4 bg-gray-700 border border-gray-600 rounded-lg">
            <h4 className="text-white font-medium mb-3">Add Custom Token</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Token Contract Address</label>
                <input
                  type="text"
                  value={newToken.address}
                  onChange={(e) => setNewToken({ ...newToken, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Symbol</label>
                  <input
                    type="text"
                    value={newToken.symbol}
                    onChange={(e) => setNewToken({ ...newToken, symbol: e.target.value })}
                    placeholder="e.g., USDT"
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Decimals</label>
                  <input
                    type="number"
                    value={newToken.decimals}
                    onChange={(e) => setNewToken({ ...newToken, decimals: parseInt(e.target.value) || 18 })}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                  placeholder="e.g., Tether USD"
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddToken}
                  disabled={loading || !newToken.address || !newToken.symbol || !newToken.name}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Add Token
                </button>
                <button
                  onClick={() => setShowNewTokenForm(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};