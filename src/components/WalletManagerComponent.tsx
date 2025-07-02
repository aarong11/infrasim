'use client';

import React, { useState } from 'react';
import { Plus, Wallet, Coins, Trash2, Copy, Eye, EyeOff, Check, X } from 'lucide-react';
import { useUnifiedWallet } from '../providers/UnifiedWalletProvider';

export const WalletManagerComponent: React.FC = () => {
  const { 
    webauthnWallets,
    isWebAuthnAuthenticated,
    connection
  } = useUnifiedWallet();

  const wallet = webauthnWallets[0]; // Get primary WebAuthn wallet
  
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
      // Placeholder - not implemented in unified wallet yet
      setError('Address creation not yet implemented in unified wallet system');
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
      // Placeholder - not implemented in unified wallet yet
      setError('Custom token management not yet implemented in unified wallet system');
      setNewToken({ address: '', symbol: '', name: '', decimals: 18, enabled: true });
      setShowNewTokenForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add token');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAddress = async (addressId: string) => {
    try {
      setLoading(true);
      // Placeholder - not implemented in unified wallet yet
      setError('Address switching not yet implemented in unified wallet system');
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

  if (!isWebAuthnAuthenticated || !wallet) {
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
            disabled={true}
            className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-gray-400 rounded-lg text-sm cursor-not-allowed"
            title="Feature coming soon"
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

          {/* Additional Addresses - Show placeholder for now */}
          {wallet.type === 'webauthn' && (wallet as any).addresses?.map((addr: any) => (
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
                    disabled={true}
                    className="px-3 py-1 bg-gray-600 text-gray-400 text-sm rounded cursor-not-allowed"
                    title="Feature coming soon"
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
            <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <p className="text-yellow-300 text-sm">
                Multi-address support is coming soon in the unified wallet system.
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowNewAddressForm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
                Close
              </button>
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
            disabled={true}
            className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-gray-400 rounded-lg text-sm cursor-not-allowed"
            title="Feature coming soon"
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
                  Balance: {wallet.type === 'webauthn' && (wallet as any).usdcBalance ? 
                    parseFloat((wallet as any).usdcBalance).toFixed(2) : '0.00'} USDC
                </div>
              </div>
              <span className="px-2 py-1 bg-blue-800 text-blue-200 text-xs rounded">Built-in</span>
            </div>
          </div>

          {/* Custom Tokens */}
          {wallet.type === 'webauthn' && (wallet as any).customTokens?.map((token: any) => (
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
                  disabled={true}
                  className="text-gray-600 cursor-not-allowed"
                  title="Feature coming soon"
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
            <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <p className="text-yellow-300 text-sm">
                Custom token management is coming soon in the unified wallet system.
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowNewTokenForm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
                Close
              </button>
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