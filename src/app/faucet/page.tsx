'use client';

import React, { useState, useEffect } from 'react';
import { useWebAuthnWallet } from '@providers/UnifiedWalletProvider';

export default function FaucetPage() {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('1.0');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [faucetStatus, setFaucetStatus] = useState<any>(null);

  // Get wallet context from unified provider
  const { wallet, isConnected, updateBalance } = useWebAuthnWallet();

  // Auto-fill address if wallet is connected
  useEffect(() => {
    if (wallet?.address) {
      setAddress(wallet.address);
    }
  }, [wallet?.address]);

  useEffect(() => {
    // Load faucet status on component mount
    loadFaucetStatus();
  }, []);

  const loadFaucetStatus = async () => {
    try {
      const response = await fetch('/api/faucet');
      const data = await response.json();
      if (data.success) {
        setFaucetStatus(data.faucet);
      }
    } catch (error) {
      console.error('Failed to load faucet status:', error);
    }
  };

  const handleRequestETH = async () => {
    if (!address.trim()) {
      setError('Please enter an Ethereum address');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address.trim(),
          amount
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        // Refresh faucet status
        await loadFaucetStatus();
        // Update wallet balance if connected
        if (isConnected && updateBalance) {
          await updateBalance();
        }
      } else {
        setError(data.error || 'Failed to request ETH');
      }
    } catch (error) {
      console.error('Faucet request error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-cyan-400 mb-2">InfraSim Faucet</h1>
            <p className="text-gray-400">Get test ETH for your wallet on the local testnet</p>
          </div>

          {/* Faucet Status */}
          {faucetStatus && (
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">Faucet Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Available Balance:</span>
                  <span className="ml-2 font-mono">{parseFloat(faucetStatus.balance).toFixed(4)} ETH</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className={`ml-2 ${faucetStatus.available ? 'text-green-400' : 'text-red-400'}`}>
                    {faucetStatus.available ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Max Amount:</span>
                  <span className="ml-2 font-mono">{faucetStatus.maxAmount} ETH</span>
                </div>
                <div>
                  <span className="text-gray-400">Faucet Address:</span>
                  <span className="ml-2 font-mono text-xs">{faucetStatus.address}</span>
                </div>
              </div>
            </div>
          )}

          {/* Connected Wallet Info */}
          {isConnected && (
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="text-blue-400">💰</div>
                <div>
                  <h4 className="text-blue-400 font-medium">Connected Wallet</h4>
                  <p className="text-gray-300 text-sm font-mono">{wallet?.address}</p>
                  <p className="text-gray-400 text-xs">
                    Balance: {wallet?.balance || '0.0'} ETH
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Request Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              />
              {isConnected && (
                <p className="text-gray-500 text-xs mt-1">
                  Auto-filled with your connected wallet address
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (ETH)
              </label>
              <select
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="0.1">0.1 ETH</option>
                <option value="0.5">0.5 ETH</option>
                <option value="1.0">1.0 ETH</option>
                <option value="2.0">2.0 ETH</option>
                <option value="5.0">5.0 ETH</option>
                <option value="10.0">10.0 ETH</option>
              </select>
              <p className="text-gray-500 text-xs mt-1">
                Choose the amount of test ETH to receive
              </p>
            </div>

            <button
              onClick={handleRequestETH}
              disabled={isLoading || !faucetStatus?.available}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? 'Sending ETH...' : `Request ${amount} ETH`}
            </button>
          </div>

          {/* Messages */}
          {message && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500 rounded-lg">
              <p className="text-green-400">{message}</p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">How to Use</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
              <li>Connect your wallet or enter any Ethereum address</li>
              <li>Select the amount of test ETH you need (0.1 - 10.0 ETH)</li>
              <li>Click "Request ETH" to receive tokens instantly</li>
              <li>Use the ETH for testing transactions, gas fees, and smart contracts</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500 rounded">
              <p className="text-blue-400 text-sm">
                <strong>Note:</strong> This faucet provides test ETH on the local Hardhat network. 
                These tokens have no real value and are only for development and testing purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}