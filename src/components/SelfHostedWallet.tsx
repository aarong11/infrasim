'use client';

import React, { useState } from 'react';
import { Wallet, Copy, Eye, EyeOff, Download, Upload, RefreshCw } from 'lucide-react';
import { useSelfHostedWallet } from './SelfHostedWalletProvider';

export const SelfHostedWallet: React.FC = () => {
  const { 
    wallet, 
    isConnected, 
    connect, 
    disconnect, 
    generateNewWallet, 
    updateBalance 
  } = useSelfHostedWallet();
  
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [showImport, setShowImport] = useState(false);

  const importWallet = async () => {
    try {
      await connect(importInput);
      setImportInput('');
      setShowImport(false);
    } catch (error) {
      alert('Invalid private key or mnemonic phrase');
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
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(walletExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `wallet-${wallet.address.slice(0, 8)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isConnected || !wallet) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={generateNewWallet}
          className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Create Wallet
        </button>
        
        <button
          onClick={() => setShowImport(!showImport)}
          className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import
        </button>
        
        {showImport && (
          <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Private Key or Mnemonic Phrase
              </label>
              <textarea
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="Enter private key (0x...) or 12/24 word mnemonic phrase"
                className="w-full p-2 border border-gray-300 rounded text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={importWallet}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    setImportInput('');
                    setShowImport(false);
                  }}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-700 font-medium">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </span>
          <span className="text-green-600">
            {parseFloat(wallet.balance).toFixed(4)} ETH
          </span>
          <button
            onClick={updateBalance}
            className="text-green-600 hover:text-green-800"
            title="Refresh balance"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        
        <button
          onClick={() => setShowImport(!showImport)}
          className="p-2 text-gray-500 hover:text-gray-700"
          title="Wallet actions"
        >
          <Wallet className="w-4 h-4" />
        </button>
      </div>

      {showImport && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-96">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Wallet Details</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Address:</label>
                <button
                  onClick={() => copyToClipboard(wallet.address)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Copy address"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={wallet.address}
                readOnly
                className="w-full p-2 text-xs bg-gray-50 border border-gray-300 rounded"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Private Key:</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-gray-600 hover:text-gray-800"
                    title="Toggle visibility"
                  >
                    {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(wallet.privateKey)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Copy private key"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <input
                type={showPrivateKey ? "text" : "password"}
                value={wallet.privateKey}
                readOnly
                className="w-full p-2 text-xs bg-gray-50 border border-gray-300 rounded"
              />
            </div>

            {wallet.mnemonic && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Mnemonic:</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Toggle visibility"
                    >
                      {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(wallet.mnemonic)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Copy mnemonic"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={showMnemonic ? wallet.mnemonic : '••••• ••••• ••••• •••••'}
                  readOnly
                  className="w-full p-2 text-xs bg-gray-50 border border-gray-300 rounded"
                  rows={2}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={exportWallet}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              <button
                onClick={disconnect}
                className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Disconnect
              </button>
              <button
                onClick={() => setShowImport(false)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};