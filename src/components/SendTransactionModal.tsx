import React, { useState, useEffect } from 'react';
import { X, Send, Wallet, AlertCircle, CheckCircle, ExternalLink, Loader } from 'lucide-react';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  type: 'native' | 'erc20' | 'erc1155';
}

interface SendTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: string;
  recipientName?: string;
  onTransactionComplete?: (txHash: string) => void;
}

export const SendTransactionModal: React.FC<SendTransactionModalProps> = ({
  isOpen,
  onClose,
  recipientAddress,
  recipientName,
  onTransactionComplete
}) => {
  const [selectedToken, setSelectedToken] = useState<Token>({
    address: 'native',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    type: 'native'
  });
  const [amount, setAmount] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('21000');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'sending' | 'complete'>('form');
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [estimatedGas, setEstimatedGas] = useState<string>('');

  // Load available tokens and balances
  useEffect(() => {
    if (isOpen) {
      loadTokensAndBalances();
      estimateGasPrice();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setAmount('');
      setMemo('');
      setError('');
      setSuccess('');
      setTxHash('');
    }
  }, [isOpen]);

  const loadTokensAndBalances = async () => {
    try {
      const response = await fetch('/api/wallet/tokens');
      if (response.ok) {
        const data = await response.json();
        setAvailableTokens(data.tokens || []);
        setWalletBalance(data.ethBalance || '0');
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  };

  const estimateGasPrice = async () => {
    try {
      const response = await fetch('/api/wallet/gas-estimate');
      if (response.ok) {
        const data = await response.json();
        setGasPrice(data.gasPrice || '20');
        setEstimatedGas(data.estimatedGas || '21000');
      }
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      setGasPrice('20'); // Fallback
    }
  };

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    const balance = selectedToken.type === 'native' ? walletBalance : selectedToken.balance || '0';
    if (parseFloat(amount) > parseFloat(balance)) {
      setError('Insufficient balance');
      return false;
    }

    if (!recipientAddress || !recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Invalid recipient address');
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setStep('sending');

    try {
      const response = await fetch('/api/wallet/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientAddress,
          amount: amount,
          token: selectedToken,
          gasPrice: gasPrice,
          gasLimit: gasLimit,
          memo: memo
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTxHash(data.txHash);
        setSuccess(`Transaction sent successfully! Hash: ${data.txHash}`);
        setStep('complete');
        onTransactionComplete?.(data.txHash);
      } else {
        throw new Error(data.error || 'Transaction failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Transaction failed');
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (validateForm()) {
      setStep('confirm');
    }
  };

  const formatBalance = (balance: string, decimals: number = 18) => {
    const num = parseFloat(balance) / Math.pow(10, decimals);
    return num.toFixed(6);
  };

  const calculateTotalCost = () => {
    const tokenAmount = parseFloat(amount) || 0;
    const gasCost = (parseFloat(gasPrice) * parseFloat(gasLimit)) / 1e9; // Convert to ETH
    
    if (selectedToken.type === 'native') {
      return tokenAmount + gasCost;
    }
    return gasCost; // For tokens, only gas cost in ETH
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Send Transaction</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            {/* Recipient Info */}
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Sending to:</div>
              <div className="text-white font-medium">
                {recipientName || 'Unknown User'}
              </div>
              <div className="text-xs text-gray-300 font-mono break-all">
                {recipientAddress}
              </div>
            </div>

            {/* Token Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Token
              </label>
              <select
                value={selectedToken.symbol}
                onChange={(e) => {
                  const token = availableTokens.find(t => t.symbol === e.target.value) || {
                    address: 'native',
                    symbol: 'ETH',
                    name: 'Ethereum',
                    decimals: 18,
                    type: 'native' as const,
                    balance: walletBalance
                  };
                  setSelectedToken(token);
                }}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="ETH">ETH - Ethereum ({formatBalance(walletBalance)} ETH)</option>
                {availableTokens.map((token) => (
                  <option key={token.address} value={token.symbol}>
                    {token.symbol} - {token.name} ({formatBalance(token.balance || '0', token.decimals)} {token.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount ({selectedToken.symbol})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.000001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => {
                    const balance = selectedToken.type === 'native' ? walletBalance : selectedToken.balance || '0';
                    const maxAmount = selectedToken.type === 'native' 
                      ? Math.max(0, parseFloat(formatBalance(balance)) - 0.001) // Reserve for gas
                      : parseFloat(formatBalance(balance, selectedToken.decimals));
                    setAmount(maxAmount.toString());
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 text-sm"
                >
                  MAX
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Available: {formatBalance(
                  selectedToken.type === 'native' ? walletBalance : selectedToken.balance || '0',
                  selectedToken.decimals
                )} {selectedToken.symbol}
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
                  value={gasPrice}
                  onChange={(e) => setGasPrice(e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gas Limit
                </label>
                <input
                  type="number"
                  value={gasLimit}
                  onChange={(e) => setGasLimit(e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Memo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Memo (Optional)
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Payment for services..."
                className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !amount}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Review
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Confirm Transaction</h4>
              <p className="text-gray-400 text-sm">Please review the transaction details below</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">To:</span>
                <span className="text-white font-mono text-sm">
                  {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white font-medium">
                  {amount} {selectedToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gas Fee:</span>
                <span className="text-white">
                  {((parseFloat(gasPrice) * parseFloat(gasLimit)) / 1e9).toFixed(6)} ETH
                </span>
              </div>
              <div className="border-t border-gray-600 pt-3 flex justify-between font-semibold">
                <span className="text-gray-300">Total Cost:</span>
                <span className="text-white">
                  {selectedToken.type === 'native' 
                    ? `${calculateTotalCost().toFixed(6)} ETH`
                    : `${amount} ${selectedToken.symbol} + ${((parseFloat(gasPrice) * parseFloat(gasLimit)) / 1e9).toFixed(6)} ETH`
                  }
                </span>
              </div>
              {memo && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Memo:</span>
                  <span className="text-white text-sm">{memo}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('form')}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Confirm Send
              </button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h4 className="text-lg font-semibold text-white mb-2">Sending Transaction</h4>
            <p className="text-gray-400">Please wait while your transaction is being processed...</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Transaction Sent!</h4>
            <p className="text-gray-400 text-sm mb-4">Your transaction has been broadcast to the network</p>
            
            {txHash && (
              <div className="bg-gray-700 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-400 mb-1">Transaction Hash:</div>
                <div className="text-white font-mono text-xs break-all">{txHash}</div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(txHash)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                  >
                    Copy Hash
                  </button>
                  <a
                    href={`/explorer/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};