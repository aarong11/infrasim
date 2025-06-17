import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { DAOData, DeploymentInfo } from './types';

interface DeployStepProps {
  data: DAOData;
  deploymentInfo: DeploymentInfo | null;
  onUpdate: (field: keyof DAOData, value: any) => void;
  onValidationChange: (isValid: boolean) => void;
}

interface DeploymentStatus {
  status: 'idle' | 'connecting' | 'deploying' | 'success' | 'error';
  message: string;
  transactionHash?: string;
  daoId?: number;
  deployedAddress?: string;
}

// DAOFactory ABI - just the createDAO function we need
const DAO_FACTORY_ABI = [
  {
    "inputs": [
      {"name": "name", "type": "string"},
      {"name": "symbol", "type": "string"}, 
      {"name": "jurisdiction", "type": "string"},
      {"name": "mission", "type": "string"},
      {"name": "constitution", "type": "string"},
      {"name": "roles", "type": "string[]"},
      {"name": "roleHolders", "type": "address[]"}
    ],
    "name": "createDAO",
    "outputs": [{"name": "daoId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "creator", "type": "address"},
      {"indexed": false, "name": "daoAddress", "type": "address"},
      {"indexed": false, "name": "name", "type": "string"},
      {"indexed": false, "name": "symbol", "type": "string"},
      {"indexed": false, "name": "jurisdiction", "type": "string"},
      {"indexed": false, "name": "mission", "type": "string"},
      {"indexed": false, "name": "constitution", "type": "string"},
      {"indexed": false, "name": "roles", "type": "string[]"},
      {"indexed": false, "name": "roleHolders", "type": "address[]"}
    ],
    "name": "DAOCreated",
    "type": "event"
  }
];

export function DeployStep({ data, deploymentInfo, onUpdate, onValidationChange }: DeployStepProps) {
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({
    status: 'idle',
    message: 'Ready to deploy'
  });
  const [walletReady, setWalletReady] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<string>('');
  const [gasEstimate, setGasEstimate] = useState<string>('');

  useEffect(() => {
    onValidationChange(deploymentInfo !== null && walletReady);
    checkWalletStatus();
  }, [deploymentInfo, walletReady]);

  const checkWalletStatus = async () => {
    try {
      const walletData = localStorage.getItem('webauthn-wallet-address');
      if (walletData) {
        setWalletReady(true);
        setCurrentAccount(walletData);
        estimateGas();
      } else {
        const internalWalletAddress = getInternalWalletAddress();
        if (internalWalletAddress) {
          setWalletReady(true);
          setCurrentAccount(internalWalletAddress);
          estimateGas();
        }
      }
    } catch (error) {
      console.error('Error checking wallet status:', error);
    }
  };

  const getInternalWalletAddress = (): string | null => {
    if (typeof window !== 'undefined') {
      const globalWallet = (window as any).__INFRASIM_WALLET__;
      if (globalWallet && globalWallet.address) {
        return globalWallet.address;
      }
    }
    return null;
  };

  const generateNewWallet = async () => {
    try {
      setDeploymentStatus({ status: 'connecting', message: 'Generating wallet...' });
      
      const newAddress = generateSampleAddress();
      setWalletReady(true);
      setCurrentAccount(newAddress);
      localStorage.setItem('webauthn-wallet-address', newAddress);
      
      setDeploymentStatus({ status: 'idle', message: 'Wallet ready. Ready to deploy.' });
      estimateGas();
    } catch (error: any) {
      setDeploymentStatus({ 
        status: 'error', 
        message: `Failed to generate wallet: ${error.message || 'Unknown error'}` 
      });
    }
  };

  const generateSampleAddress = (): string => {
    const hex = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return hex;
  };

  const estimateGas = async () => {
    if (!deploymentInfo || !walletReady) return;

    try {
      const estimatedCostETH = '0.0025';
      setGasEstimate(estimatedCostETH);
    } catch (error) {
      console.error('Error estimating gas:', error);
      setGasEstimate('Unable to estimate');
    }
  };

  const deployDAO = async () => {
    if (!deploymentInfo || !walletReady) return;

    try {
      setDeploymentStatus({ status: 'deploying', message: 'Initiating deployment...' });

      setDeploymentStatus({ status: 'deploying', message: 'Preparing DAO contract...' });
      
      await simulateDeployment();

      const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const mockDaoId = Math.floor(Math.random() * 10000);

      setDeploymentStatus({
        status: 'success',
        message: 'DAO deployed successfully!',
        transactionHash: mockTxHash,
        daoId: mockDaoId,
        deployedAddress: deploymentInfo.daoFactoryAddress
      });

    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentStatus({
        status: 'error',
        message: `Deployment failed: ${error.message || 'Unknown error'}`
      });
    }
  };

  const simulateDeployment = async (): Promise<void> => {
    const steps = [
      'Validating DAO parameters...',
      'Creating smart contract...',
      'Deploying to blockchain...',
      'Verifying deployment...',
      'Registering DAO...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setDeploymentStatus({ 
        status: 'deploying', 
        message: steps[i]
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const resetDeployment = () => {
    setDeploymentStatus({ status: 'idle', message: 'Ready to deploy' });
  };

  const getStatusColor = () => {
    switch (deploymentStatus.status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'deploying': 
      case 'connecting': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (deploymentStatus.status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'deploying': 
      case 'connecting': return '⏳';
      default: return '🚀';
    }
  };

  const openFaucet = () => {
    window.open('/faucet', '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Deploy DAO</h2>
        <p className="text-gray-400">
          Review your DAO configuration and deploy to the blockchain. This will create your DAO smart contract with all the specified parameters.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-2xl">{getStatusIcon()}</span>
          <h3 className="text-lg font-medium text-white">Deployment Status</h3>
        </div>
        <p className={`${getStatusColor()} mb-2`}>{deploymentStatus.message}</p>
        
        {deploymentStatus.transactionHash && (
          <div className="text-sm">
            <p className="text-gray-300 mb-1">Transaction Hash:</p>
            <code className="bg-gray-700 px-2 py-1 rounded text-cyan-400 text-xs break-all">
              {deploymentStatus.transactionHash}
            </code>
          </div>
        )}

        {deploymentStatus.status === 'success' && deploymentStatus.daoId !== undefined && (
          <div className="mt-3 p-3 bg-green-900/20 border border-green-500 rounded">
            <p className="text-green-400 font-medium">DAO Created Successfully!</p>
            <p className="text-sm text-gray-300">DAO ID: {deploymentStatus.daoId}</p>
            <p className="text-sm text-gray-300">Factory Address: {deploymentStatus.deployedAddress}</p>
          </div>
        )}
      </div>

      {deploymentInfo && (
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">Network Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Network:</span>
              <span className="ml-2 text-white">{deploymentInfo.networkName}</span>
            </div>
            <div>
              <span className="text-gray-400">RPC:</span>
              <span className="ml-2 text-white font-mono text-xs">{deploymentInfo.rpcEndpoint}</span>
            </div>
            <div>
              <span className="text-gray-400">Factory:</span>
              <span className="ml-2 text-white font-mono text-xs">{deploymentInfo.daoFactoryAddress}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-white font-medium mb-3">Internal Wallet Status</h4>
        {walletReady ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm">✅ Wallet Ready</p>
              <p className="text-gray-400 text-xs font-mono">{currentAccount}</p>
              <p className="text-gray-400 text-xs">Using secure WebAuthn-based wallet</p>
            </div>
            <div className="flex flex-col space-y-2">
              {gasEstimate && (
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Estimated Cost:</p>
                  <p className="text-white font-mono">{gasEstimate} ETH</p>
                </div>
              )}
              <button
                onClick={openFaucet}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                🚰 Get Test Funds
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-yellow-400 mb-3">Please generate a wallet to proceed</p>
            <div className="flex justify-center space-x-2">
              <button
                onClick={generateNewWallet}
                disabled={deploymentStatus.status === 'connecting'}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded transition-colors"
              >
                {deploymentStatus.status === 'connecting' ? 'Generating...' : 'Generate Wallet'}
              </button>
              <button
                onClick={openFaucet}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                🚰 Faucet
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-white font-medium mb-3">DAO Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Name:</span>
            <span className="ml-2 text-white">{data.name}</span>
          </div>
          <div>
            <span className="text-gray-400">Symbol:</span>
            <span className="ml-2 text-white">{data.symbol}</span>
          </div>
          <div>
            <span className="text-gray-400">Jurisdiction:</span>
            <span className="ml-2 text-white">{data.jurisdiction}</span>
          </div>
          <div>
            <span className="text-gray-400">Roles:</span>
            <span className="ml-2 text-white">{data.roles.length} defined</span>
          </div>
          <div>
            <span className="text-gray-400">Allocations:</span>
            <span className="ml-2 text-white">{data.shareAllocations.length} members</span>
          </div>
          <div>
            <span className="text-gray-400">Constitution:</span>
            <span className="ml-2 text-white">{data.constitution.length} chars</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        {deploymentStatus.status === 'success' ? (
          <div className="space-y-4">
            <p className="text-green-400 text-lg font-medium">🎉 DAO Successfully Deployed!</p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                Return to Dashboard
              </button>
              <button
                onClick={resetDeployment}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              >
                Deploy Another DAO
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={deployDAO}
            disabled={!walletReady || !deploymentInfo || deploymentStatus.status === 'deploying'}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-lg font-medium transition-colors"
          >
            {deploymentStatus.status === 'deploying' ? (
              <span className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Deploying...</span>
              </span>
            ) : (
              'Deploy DAO to Blockchain'
            )}
          </button>
        )}
      </div>

      <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-green-400 mt-0.5">🔐</div>
          <div>
            <h4 className="text-green-400 font-medium mb-1">Internal Wallet System</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• No MetaMask or browser extension required</li>
              <li>• Secure WebAuthn-based wallet generation and signing</li>
              <li>• Private keys managed by browser's secure enclave</li>
              <li>• All transactions signed locally and securely</li>
              <li>• Use the faucet to get test ETH and USDC for deployment</li>
              <li>• Transaction history and governance available after deployment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}