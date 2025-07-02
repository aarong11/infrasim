'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NetworkConfig {
  networkName: string;
  chainId: number;
  rpcUrl: string;
  blockTime: number;
  gasPrice: string;
  gasLimit: string;
}

interface AdminWallet {
  address: string;
  privateKey?: string;
  mnemonic?: string;
  isHardwareWallet: boolean;
}

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'network' | 'wallet' | 'confirm'>('network');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');

  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    networkName: 'Polygon Mumbai Testnet',
    chainId: 80001,
    rpcUrl: 'http://localhost:8545',
    blockTime: 2,
    gasPrice: '20000000000',
    gasLimit: '20000000'
  });

  const [adminWallet, setAdminWallet] = useState<AdminWallet>({
    address: '',
    privateKey: '',
    mnemonic: '',
    isHardwareWallet: false
  });

  const [walletType, setWalletType] = useState<'new' | 'import' | 'hardware'>('new');

  // Check if setup is already completed
  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup');
      const data = await response.json();
      
      if (data.success && data.setupCompleted) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to check setup status:', error);
    }
  };

  const generateNewWallet = () => {
    // Generate a new wallet using ethers.js
    import('ethers').then(({ ethers }) => {
      const wallet = ethers.Wallet.createRandom();
      setAdminWallet({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || '',
        isHardwareWallet: false
      });
    });
  };

  const handleNetworkSubmit = () => {
    setCurrentStep('wallet');
  };

  const handleWalletSubmit = () => {
    if (!adminWallet.address) {
      setError('Please configure your admin wallet');
      return;
    }
    setCurrentStep('confirm');
  };

  const handleFinalSubmit = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          networkConfig,
          adminWallet
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show success message briefly before redirect
        setError(''); // Clear any previous errors
        setIsCompleted(true);
        setIsLoading(false);
        
        // Use window.location for a more reliable redirect after showing success
        setTimeout(() => {
          window.location.href = '/?setup=complete';
        }, 2000);
        
        // Also try the router as backup
        router.push('/?setup=complete');
      } else {
        setError(data.error || 'Setup failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Setup error:', error);
      setError('Failed to complete setup');
      setIsLoading(false);
    }
  };

  const renderNetworkStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Network Configuration</h2>
        <p className="text-gray-400">Configure your Hardhat Polygon testnet settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Network Name
          </label>
          <input
            type="text"
            value={networkConfig.networkName}
            onChange={(e) => setNetworkConfig(prev => ({ ...prev, networkName: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder="Polygon Mumbai Testnet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Chain ID
          </label>
          <input
            type="number"
            value={networkConfig.chainId}
            onChange={(e) => setNetworkConfig(prev => ({ ...prev, chainId: parseInt(e.target.value) }))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            RPC URL
          </label>
          <input
            type="text"
            value={networkConfig.rpcUrl}
            onChange={(e) => setNetworkConfig(prev => ({ ...prev, rpcUrl: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Block Time (seconds)
          </label>
          <input
            type="number"
            value={networkConfig.blockTime}
            onChange={(e) => setNetworkConfig(prev => ({ ...prev, blockTime: parseInt(e.target.value) }))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Gas Price (wei)
          </label>
          <input
            type="text"
            value={networkConfig.gasPrice}
            onChange={(e) => setNetworkConfig(prev => ({ ...prev, gasPrice: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Gas Limit
          </label>
          <input
            type="text"
            value={networkConfig.gasLimit}
            onChange={(e) => setNetworkConfig(prev => ({ ...prev, gasLimit: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        onClick={handleNetworkSubmit}
        className="w-full bg-cyan-600 hover:bg-cyan-700 px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Continue to Wallet Setup
      </button>
    </div>
  );

  const renderWalletStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Admin Wallet Setup</h2>
        <p className="text-gray-400">Configure your admin wallet for DAO deployment and management</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setWalletType('new')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              walletType === 'new' 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-gray-600 bg-gray-700/50'
            }`}
          >
            <div className="text-2xl mb-2">🔑</div>
            <div className="font-medium">Generate New</div>
            <div className="text-sm text-gray-400">Create a new wallet</div>
          </button>

          <button
            onClick={() => setWalletType('import')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              walletType === 'import' 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-gray-600 bg-gray-700/50'
            }`}
          >
            <div className="text-2xl mb-2">📥</div>
            <div className="font-medium">Import Existing</div>
            <div className="text-sm text-gray-400">Use private key/mnemonic</div>
          </button>

          <button
            onClick={() => setWalletType('hardware')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              walletType === 'hardware' 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-gray-600 bg-gray-700/50'
            }`}
          >
            <div className="text-2xl mb-2">🔒</div>
            <div className="font-medium">Hardware Wallet</div>
            <div className="text-sm text-gray-400">Connect hardware device</div>
          </button>
        </div>

        {walletType === 'new' && (
          <div className="bg-gray-700/50 p-6 rounded-lg">
            <button
              onClick={generateNewWallet}
              className="mb-4 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
            >
              Generate New Wallet
            </button>
            
            {adminWallet.address && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                  <input
                    type="text"
                    value={adminWallet.address}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Private Key</label>
                  <input
                    type="password"
                    value={adminWallet.privateKey}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mnemonic</label>
                  <textarea
                    value={adminWallet.mnemonic}
                    readOnly
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white font-mono text-sm"
                  />
                </div>
                <div className="bg-yellow-900/30 border border-yellow-600 p-4 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ <strong>Important:</strong> Save your private key and mnemonic in a secure location. 
                    You'll need them to access your admin wallet.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {walletType === 'import' && (
          <div className="bg-gray-700/50 p-6 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Private Key or Mnemonic
              </label>
              <textarea
                placeholder="Enter your private key (0x...) or mnemonic phrase"
                rows={3}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  if (value.startsWith('0x')) {
                    // Private key
                    import('ethers').then(({ ethers }) => {
                      try {
                        const wallet = new ethers.Wallet(value);
                        setAdminWallet({
                          address: wallet.address,
                          privateKey: value,
                          mnemonic: '',
                          isHardwareWallet: false
                        });
                      } catch (error) {
                        setError('Invalid private key');
                      }
                    });
                  } else if (value.split(' ').length >= 12) {
                    // Mnemonic
                    import('ethers').then(({ ethers }) => {
                      try {
                        const wallet = ethers.Wallet.fromPhrase(value);
                        setAdminWallet({
                          address: wallet.address,
                          privateKey: wallet.privateKey,
                          mnemonic: value,
                          isHardwareWallet: false
                        });
                      } catch (error) {
                        setError('Invalid mnemonic phrase');
                      }
                    });
                  }
                }}
                className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            
            {adminWallet.address && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={adminWallet.address}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white font-mono text-sm"
                />
              </div>
            )}
          </div>
        )}

        {walletType === 'hardware' && (
          <div className="bg-gray-700/50 p-6 rounded-lg text-center">
            <div className="text-4xl mb-4">🔒</div>
            <p className="text-gray-400 mb-4">Hardware wallet support coming soon!</p>
            <p className="text-sm text-gray-500">For now, please use the generate or import options.</p>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setCurrentStep('network')}
          className="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleWalletSubmit}
          disabled={!adminWallet.address}
          className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Continue to Review
        </button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Review Configuration</h2>
        <p className="text-gray-400">Please review your settings before completing setup</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-700/50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Network Configuration</h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="ml-2 text-white">{networkConfig.networkName}</span>
            </div>
            <div>
              <span className="text-gray-400">Chain ID:</span>
              <span className="ml-2 text-white">{networkConfig.chainId}</span>
            </div>
            <div>
              <span className="text-gray-400">RPC URL:</span>
              <span className="ml-2 text-white">{networkConfig.rpcUrl}</span>
            </div>
            <div>
              <span className="text-gray-400">Block Time:</span>
              <span className="ml-2 text-white">{networkConfig.blockTime}s</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-700/50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Admin Wallet</h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Address:</span>
              <span className="ml-2 text-white font-mono text-sm break-all">{adminWallet.address}</span>
            </div>
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="ml-2 text-white">
                {adminWallet.isHardwareWallet ? 'Hardware Wallet' : 'Software Wallet'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/30 border border-blue-600 p-4 rounded-lg">
        <h4 className="text-blue-400 font-semibold mb-2">What happens next?</h4>
        <ul className="text-blue-300 text-sm space-y-1">
          <li>• Your Hardhat Polygon testnet will be configured with these settings</li>
          <li>• DAO Factory and other smart contracts will be deployed</li>
          <li>• Your admin wallet will be set as the owner of deployed contracts</li>
          <li>• You'll be able to create and manage DAOs through the interface</li>
        </ul>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setCurrentStep('wallet')}
          className="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleFinalSubmit}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Setting up...</span>
            </>
          ) : (
            <span>Complete Setup</span>
          )}
        </button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-3xl font-bold text-green-400 mb-2">Setup Complete!</h2>
      <p className="text-gray-400 text-lg">
        Your InfraSim environment has been successfully configured.
      </p>
      <div className="bg-green-900/30 border border-green-600 p-6 rounded-lg text-left max-w-md mx-auto">
        <h4 className="text-green-400 font-semibold mb-3">What's been set up:</h4>
        <ul className="text-green-300 text-sm space-y-2">
          <li>✓ Hardhat Polygon testnet configured</li>
          <li>✓ Admin wallet registered</li>
          <li>✓ Smart contracts deployed</li>
          <li>✓ DAO Factory ready for use</li>
        </ul>
      </div>
      <div className="flex items-center justify-center space-x-2 text-gray-400">
        <div className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
        <span>Redirecting to dashboard...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-4">
            Welcome to InfraSim
          </h1>
          <p className="text-xl text-gray-400">
            Let's set up your Hardhat Polygon testnet and admin wallet
          </p>
        </div>

        {!isCompleted && (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep === 'network' ? 'bg-cyan-600' : 'bg-green-600'
                } text-white font-semibold`}>
                  1
                </div>
                <div className={`h-1 w-16 ${currentStep === 'network' ? 'bg-gray-600' : 'bg-green-600'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep === 'network' ? 'bg-gray-600' : 
                  currentStep === 'wallet' ? 'bg-cyan-600' : 'bg-green-600'
                } text-white font-semibold`}>
                  2
                </div>
                <div className={`h-1 w-16 ${currentStep === 'confirm' ? 'bg-green-600' : 'bg-gray-600'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep === 'confirm' ? 'bg-cyan-600' : 'bg-gray-600'
                } text-white font-semibold`}>
                  3
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </>
        )}

        <div className="bg-gray-800 rounded-lg p-8">
          {isCompleted ? renderSuccessStep() : (
            <>
              {currentStep === 'network' && renderNetworkStep()}
              {currentStep === 'wallet' && renderWalletStep()}
              {currentStep === 'confirm' && renderConfirmStep()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}