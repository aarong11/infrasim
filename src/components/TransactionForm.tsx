'use client';

import React, { useState } from 'react';
import { Send, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useWebAuthnWallet } from './WebAuthnWalletProvider';

interface TransactionFormProps {
  onTransactionSent?: (txHash: string) => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onTransactionSent }) => {
  const { wallet, isAuthenticated, sendTransaction } = useWebAuthnWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const handleSendTransaction = async () => {
    if (!to || !amount) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setTxHash('');

      const hash = await sendTransaction(to, amount);
      setTxHash(hash);
      setTo('');
      setAmount('');
      
      if (onTransactionSent) {
        onTransactionSent(hash);
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || !wallet) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Authenticate with your secure wallet to send transactions</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Transaction</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To Address
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">From:</span>
            <span className="font-mono">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Balance:</span>
            <span>{parseFloat(wallet.balance).toFixed(4)} ETH</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {txHash && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 font-medium">Transaction Sent!</span>
            </div>
            <p className="text-sm text-gray-600">Hash:</p>
            <p className="text-xs font-mono bg-white p-2 rounded border">{txHash}</p>
          </div>
        )}

        <button
          onClick={handleSendTransaction}
          disabled={isLoading || !to || !amount}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Transaction
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};