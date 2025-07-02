'use client';
import React, { useState, useEffect } from 'react';
import { useDAO, useDAODeployment } from '../hooks/useDAO';
import { CreateDAORequest } from '../services/DAOService';

/**
 * Example component demonstrating DAO service usage
 * This shows how to integrate the DAO service into React components
 */
export function DAOManagementExample() {
  const {
    daos,
    currentDAO,
    isLoading,
    error,
    isDeployed,
    createDAO,
    loadAllDAOs,
    loadDAO,
    clearError,
    refreshDAOs,
    validateDAOParams
  } = useDAO();

  const { deploymentInfo } = useDAODeployment();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    jurisdiction: 'Delaware, USA',
    mission: '',
    constitution: '',
    roles: ['Founder', 'Member'],
    roleHolders: ['']
  });

  // Load DAOs on component mount
  useEffect(() => {
    if (isDeployed) {
      loadAllDAOs();
    }
  }, [isDeployed, loadAllDAOs]);

  const handleCreateDAO = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty values
    const filteredRoles = formData.roles.filter(role => role.trim());
    const filteredRoleHolders = formData.roleHolders.filter(holder => holder.trim());

    const daoParams: Omit<CreateDAORequest, 'action'> = {
      name: formData.name,
      symbol: formData.symbol,
      jurisdiction: formData.jurisdiction,
      mission: formData.mission,
      constitution: formData.constitution,
      roles: filteredRoles,
      roleHolders: filteredRoleHolders,
      createCompany: true,
      companyData: {
        name: formData.name.replace(' DAO', '').trim() || formData.name,
        description: formData.mission,
        sectorTags: ['🏛️ DAO', '🏢 Organization'],
        services: ['Decentralized Governance'],
        metadata: {
          industry: 'governance',
          jurisdiction: formData.jurisdiction,
          daoManaged: true
        }
      }
    };

    const result = await createDAO(daoParams);
    
    if (result.success) {
      setShowCreateForm(false);
      // Reset form
      setFormData({
        name: '',
        symbol: '',
        jurisdiction: 'Delaware, USA',
        mission: '',
        constitution: '',
        roles: ['Founder', 'Member'],
        roleHolders: ['']
      });
    }
  };

  const addRole = () => {
    setFormData({
      ...formData,
      roles: [...formData.roles, ''],
      roleHolders: [...formData.roleHolders, '']
    });
  };

  const removeRole = (index: number) => {
    const newRoles = formData.roles.filter((_, i) => i !== index);
    const newRoleHolders = formData.roleHolders.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      roles: newRoles,
      roleHolders: newRoleHolders
    });
  };

  const updateRole = (index: number, value: string) => {
    const newRoles = [...formData.roles];
    newRoles[index] = value;
    setFormData({ ...formData, roles: newRoles });
  };

  const updateRoleHolder = (index: number, value: string) => {
    const newRoleHolders = [...formData.roleHolders];
    newRoleHolders[index] = value;
    setFormData({ ...formData, roleHolders: newRoleHolders });
  };

  if (!isDeployed) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-yellow-400 mb-2">
            DAO Factory Not Deployed
          </h3>
          <p className="text-gray-400 mb-4">
            The DAO Factory contract is not deployed or not accessible.
          </p>
          {error && (
            <p className="text-red-400 text-sm mb-4">Error: {error}</p>
          )}
          <div className="text-left bg-gray-700 p-4 rounded text-sm">
            <p className="text-gray-300 mb-2">To deploy contracts:</p>
            <code className="text-cyan-400">
              cd ethereum && npm run deploy
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Deployment Info */}
      {deploymentInfo && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
          <h4 className="text-green-400 font-semibold mb-2">✅ DAO Factory Connected</h4>
          <div className="text-sm text-gray-300 space-y-1">
            <p><strong>Network:</strong> {deploymentInfo.networkName}</p>
            <p><strong>RPC:</strong> {deploymentInfo.rpcEndpoint}</p>
            <p><strong>Contract:</strong> {deploymentInfo.daoFactoryAddress}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-400">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">DAO Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={refreshDAOs}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
          >
            {isLoading ? '⟳' : '🔄'} Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            ➕ Create DAO
          </button>
        </div>
      </div>

      {/* DAOs List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Existing DAOs ({daos.length})
        </h3>
        
        {isLoading && daos.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading DAOs...</p>
          </div>
        ) : daos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No DAOs found. Create the first one!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {daos.map((dao) => (
              <div key={dao.id} className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">{dao.name}</h4>
                <p className="text-sm text-gray-300 mb-2">Symbol: {dao.symbol}</p>
                <p className="text-sm text-gray-300 mb-2">Jurisdiction: {dao.jurisdiction}</p>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{dao.mission}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadDAO(dao.id!)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current DAO Details */}
      {currentDAO && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">DAO Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-300">Name</label>
              <p className="text-white bg-gray-700 p-2 rounded">{currentDAO.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">Symbol</label>
              <p className="text-white bg-gray-700 p-2 rounded">{currentDAO.symbol}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Mission</label>
              <p className="text-white bg-gray-700 p-3 rounded">{currentDAO.mission}</p>
            </div>
            {currentDAO.constitution && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-300">Constitution</label>
                <p className="text-white bg-gray-700 p-3 rounded whitespace-pre-wrap">
                  {currentDAO.constitution}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-300">Roles</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {Array.isArray(currentDAO.roles) && currentDAO.roles.map((role, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-600 text-white text-sm rounded"
                  >
                    {typeof role === 'string' ? role : role.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">Members</label>
              <p className="text-white bg-gray-700 p-2 rounded">
                {currentDAO.members?.length || 0} members
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create DAO Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Create New DAO</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDAO} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Jurisdiction
                </label>
                <select
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Delaware, USA">Delaware, USA</option>
                  <option value="Wyoming, USA">Wyoming, USA</option>
                  <option value="Switzerland">Switzerland</option>
                  <option value="Singapore">Singapore</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Mission Statement
                </label>
                <textarea
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Constitution (Optional)
                </label>
                <textarea
                  value={formData.constitution}
                  onChange={(e) => setFormData({ ...formData, constitution: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Roles & Members
                </label>
                {formData.roles.map((role, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-2 mb-2">
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => updateRole(index, e.target.value)}
                      placeholder="Role name"
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                    />
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={formData.roleHolders[index] || ''}
                        onChange={(e) => updateRoleHolder(index, e.target.value)}
                        placeholder="0x..."
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none font-mono text-sm"
                      />
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeRole(index)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRole}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded border-2 border-dashed border-gray-500 transition-colors"
                >
                  + Add Role
                </button>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Create DAO</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}