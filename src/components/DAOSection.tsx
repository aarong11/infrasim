'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSmartContract } from '../hooks/useSmartContract';
import { useUnifiedWallet } from '../providers/UnifiedWalletProvider';

interface DAOSectionProps {
  companyId: string;
  daoContractAddress?: string;
  companyName: string;
  onDAOCreated?: (daoId: number) => void;
}

export const DAOSection: React.FC<DAOSectionProps> = ({
  companyId,
  daoContractAddress,
  companyName,
  onDAOCreated
}) => {
  const router = useRouter();
  const {
    getAllDAOs,
    getTotalDAOs,
    getContractInfo
  } = useSmartContract();

  // Use the unified wallet system
  const { isConnected, activeWallet, isInitialized } = useUnifiedWallet();

  const [daos, setDaos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeployed, setIsDeployed] = useState(false);

  useEffect(() => {
    checkDeployment();
  }, []);

  useEffect(() => {
    if (isDeployed && isConnected) {
      loadAllDAOs();
    }
  }, [isDeployed, isConnected]);

  const checkDeployment = async () => {
    try {
      // Always assume contracts are deployed in a development environment
      setIsDeployed(true);
      
      // Try to get contract info, but don't fail if it's not available
      const contractInfo = getContractInfo('DAOFactory');
      if (!contractInfo || !contractInfo.address) {
        console.warn('DAOFactory deployment data not found, but continuing anyway');
        setError('Using fallback configuration - some features may be limited');
      }
    } catch (err) {
      console.error('Error checking deployment:', err);
      setIsDeployed(true);
      setError('Using fallback configuration - deployment data unavailable');
    }
  };

  const loadAllDAOs = async () => {
    if (!isConnected) {
      setError('Please connect your wallet to view DAOs');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const result = await getAllDAOs();
      if (result.success) {
        setDaos(result.data || []);
      } else {
        setError(result.error || 'Failed to load DAOs');
      }
    } catch (err) {
      console.error('Error loading DAOs:', err);
      setError('Failed to load DAOs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDAO = () => {
    router.push(`/company/${companyId}/dao/create`);
  };

  const handleViewDAO = (daoId: number) => {
    router.push(`/company/${companyId}/dao/${daoId}`);
  };

  const clearError = () => {
    setError('');
  };

  if (!isInitialized) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">🏛️</span>
          DAO Information
        </h3>
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
          <span className="text-gray-400">Initializing wallet system...</span>
        </div>
      </div>
    );
  }

  if (isLoading && daos.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">🏛️</span>
          DAO Information
        </h3>
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
          <span className="text-gray-400">Loading DAO information...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">🏛️</span>
          DAO Information
        </h3>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🔐</div>
          <h4 className="text-lg text-yellow-400 mb-2">Wallet Required</h4>
          <p className="text-gray-400 mb-4 text-sm">
            Please connect your wallet to view and manage DAOs.
          </p>
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3 mt-4">
            <p className="text-blue-400 text-sm mb-2">
              <strong>To connect your wallet:</strong>
            </p>
            <ol className="text-blue-300 text-xs list-decimal list-inside space-y-1">
              <li>Look for the wallet section in the top-right corner</li>
              <li>Click "Create Secure Wallet" or "Authenticate" if you already have one</li>
              <li>Use your biometric authentication (fingerprint/face ID)</li>
              <li>Return here to view and create DAOs</li>
            </ol>
          </div>
          {activeWallet && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm">
                ✅ Wallet Available: {activeWallet.label} ({activeWallet.type})
              </p>
              <p className="text-green-300 text-xs font-mono">
                {activeWallet.address.slice(0, 10)}...{activeWallet.address.slice(-4)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">🏛️</span>
        DAO Information
      </h3>

      {/* Connected Wallet Info */}
      {activeWallet && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm font-medium">
                Connected: {activeWallet.label} ({activeWallet.type})
              </p>
              <p className="text-green-300 text-xs font-mono">
                {activeWallet.address.slice(0, 10)}...{activeWallet.address.slice(-4)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-green-300 text-sm">
                {parseFloat(activeWallet.balance).toFixed(4)} ETH
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {daos.length > 0 ? (
        <div className="space-y-4">
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-3">
              Found {daos.length} DAO{daos.length > 1 ? 's' : ''} on the network:
            </p>
          </div>

          {daos.map((dao, index) => (
            <div key={index} className="border border-gray-700 rounded-lg p-4 bg-gray-700/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-lg font-medium text-white">{dao.name}</h4>
                    <span className="px-2 py-1 bg-green-600 text-white rounded text-xs">Active</span>
                  </div>
                  
                  <div className="mb-3">
                    <label className="text-sm font-medium text-gray-300">Description</label>
                    <p className="text-white bg-gray-700 p-3 rounded mt-1">{dao.description}</p>
                  </div>

                  <div className="mb-3">
                    <label className="text-sm font-medium text-gray-300">Contract Address</label>
                    <p className="text-cyan-400 font-mono text-sm mt-1">{dao.address}</p>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-300">Creator</label>
                    <p className="text-gray-300 font-mono text-sm mt-1">
                      {dao.creator?.slice(0, 6)}...{dao.creator?.slice(-4)}
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleViewDAO(index)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors flex items-center space-x-2"
                    >
                      <span>👁️</span>
                      <span>View Details</span>
                    </button>
                    <Link
                      href={`/company/${companyId}/dao/${index}/manage`}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center space-x-2"
                    >
                      <span>⚙️</span>
                      <span>Manage</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-6 pt-4 border-t border-gray-700">
            <button
              onClick={handleCreateDAO}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Create New DAO</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏗️</div>
          <h4 className="text-lg text-gray-400 mb-2">No DAOs Found</h4>
          <p className="text-gray-500 mb-6">
            No DAOs exist on the network yet. Create the first DAO to enable decentralized governance for {companyName}.
          </p>
          <button
            onClick={handleCreateDAO}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
          >
            <span>🚀</span>
            <span>Create Company DAO</span>
          </button>
        </div>
      )}
    </div>
  );
};