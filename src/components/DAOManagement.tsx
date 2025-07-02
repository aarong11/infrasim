'use client';

import React, { useState, useEffect } from 'react';
import { useSmartContract } from '../hooks/useSmartContract';
import { CreateDAOParams } from '@shared/index';

export const DAOManagement: React.FC = () => {
  const {
    isConnected,
    activeWalletType,
    walletAddress,
    createDAO,
    getAllDAOs,
    getTotalDAOs,
    estimateCreateDAOGas,
    refreshDeploymentData
  } = useSmartContract();

  const [daos, setDaos] = useState<any[]>([]);
  const [totalDAOs, setTotalDAOs] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [createForm, setCreateForm] = useState<CreateDAOParams>({
    name: '',
    description: '',
    votingPeriod: 86400, // 1 day
    proposalThreshold: 1
  });

  // Load DAOs when component mounts or wallet connects
  useEffect(() => {
    if (isConnected) {
      loadDAOs();
    }
  }, [isConnected]);

  const loadDAOs = async () => {
    if (!isConnected) return;

    try {
      setLoading(true);
      setError('');

      // Get total count
      const totalResult = await getTotalDAOs();
      if (totalResult.success) {
        setTotalDAOs(totalResult.data || 0);
      }

      // Get all DAOs
      const daosResult = await getAllDAOs();
      if (daosResult.success) {
        setDaos(daosResult.data || []);
      } else {
        setError(daosResult.error || 'Failed to load DAOs');
      }
    } catch (err) {
      setError('Error loading DAOs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDAO = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!createForm.name || !createForm.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Estimate gas first
      const gasResult = await estimateCreateDAOGas(createForm);
      if (!gasResult.success) {
        setError(`Gas estimation failed: ${gasResult.error}`);
        return;
      }

      console.log('Estimated gas:', gasResult.data);

      // Create the DAO
      const result = await createDAO(createForm);
      
      if (result.success) {
        setSuccess(`DAO created successfully! Transaction: ${result.txHash}`);
        setCreateForm({
          name: '',
          description: '',
          votingPeriod: 86400,
          proposalThreshold: 1
        });
        // Reload DAOs
        await loadDAOs();
      } else {
        setError(result.error || 'Failed to create DAO');
      }
    } catch (err) {
      setError('Error creating DAO');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">DAO Management</h2>
        <p className="text-gray-400">Please connect your wallet to manage DAOs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Status */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Wallet Connected</h3>
            <p className="text-gray-400 text-sm">
              {activeWalletType} • {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </p>
          </div>
          <button
            onClick={refreshDeploymentData}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Refresh Contracts
          </button>
        </div>
      </div>

      {/* Create DAO Form */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Create New DAO</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              DAO Name *
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="My Awesome DAO"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Describe your DAO's purpose and goals"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Voting Period (seconds)
              </label>
              <input
                type="number"
                value={createForm.votingPeriod}
                onChange={(e) => setCreateForm({ ...createForm, votingPeriod: parseInt(e.target.value) })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Proposal Threshold
              </label>
              <input
                type="number"
                value={createForm.proposalThreshold}
                onChange={(e) => setCreateForm({ ...createForm, proposalThreshold: parseInt(e.target.value) })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCreateDAO}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating DAO...' : 'Create DAO'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* DAOs List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Deployed DAOs ({totalDAOs})
          </h2>
          <button
            onClick={loadDAOs}
            disabled={loading}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:bg-gray-500"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {daos.length === 0 ? (
          <p className="text-gray-400">No DAOs found. Create the first one!</p>
        ) : (
          <div className="space-y-3">
            {daos.map((dao, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{dao.name}</h3>
                    <p className="text-gray-400 text-sm">{dao.description}</p>
                    <p className="text-gray-500 text-xs font-mono mt-1">
                      Address: {dao.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Creator:</p>
                    <p className="text-gray-300 text-xs font-mono">
                      {dao.creator?.slice(0, 6)}...{dao.creator?.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};