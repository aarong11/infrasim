'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ClientVectorMemoryService } from '@/core/client-vector-memory-service';
import { CompanyMemoryRecord } from '@/types/infrastructure';

export default function CreateDAOPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const vectorService = new ClientVectorMemoryService();

  const [company, setCompany] = useState<CompanyMemoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    jurisdiction: 'Delaware, USA',
    mission: '',
    constitution: '',
    roles: ['Founder', 'Member'],
    roleHolders: ['']
  });

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  const loadCompany = async () => {
    try {
      const companies = await vectorService.getAllCompaniesFromMemory();
      const foundCompany = companies.find(c => c.id === companyId);
      
      if (foundCompany) {
        setCompany(foundCompany);
        // Pre-fill form with company data
        setFormData(prev => ({
          ...prev,
          name: `${foundCompany.name} DAO`,
          symbol: foundCompany.name.substring(0, 4).toUpperCase(),
          mission: `Decentralized governance for ${foundCompany.name}. ${foundCompany.description}`
        }));
      } else {
        setError('Company not found');
      }
    } catch (err) {
      console.error('Failed to load company:', err);
      setError('Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (index: number, value: string) => {
    const newRoles = [...formData.roles];
    newRoles[index] = value;
    setFormData({ ...formData, roles: newRoles });
  };

  const handleRoleHolderChange = (index: number, value: string) => {
    const newRoleHolders = [...formData.roleHolders];
    newRoleHolders[index] = value;
    setFormData({ ...formData, roleHolders: newRoleHolders });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      // Filter out empty roles and role holders
      const filteredRoles = formData.roles.filter(role => role.trim());
      const filteredRoleHolders = formData.roleHolders.filter(holder => holder.trim());

      // Create the DAO and company together
      const response = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: formData.name,
          symbol: formData.symbol,
          jurisdiction: formData.jurisdiction,
          mission: formData.mission,
          constitution: formData.constitution,
          roles: filteredRoles,
          roleHolders: filteredRoleHolders,
          // Company creation data
          createCompany: true,
          companyData: {
            name: formData.name.replace(' DAO', ''), // Remove DAO suffix for company name
            description: formData.mission,
            sectorTags: ['🏛️ DAO', '🏢 Organization'],
            services: ['Decentralized Governance', 'Community Management'],
            metadata: {
              industry: 'governance',
              complexity: 'simple',
              compliance: [],
              daoManaged: true,
              jurisdiction: formData.jurisdiction
            }
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        // Navigate to the newly created company's dashboard
        router.push(`/company/${result.companyId}/dashboard?dao_created=${result.daoId}`);
      } else {
        setError(result.error || 'Failed to create DAO');
      }
    } catch (err) {
      console.error('Error creating DAO:', err);
      setError(err instanceof Error ? err.message : 'Failed to create DAO');
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    router.push(`/company/${companyId}/dashboard`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-xl text-gray-400">Loading company information...</h3>
        </div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl text-gray-400 mb-2">Error</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to Dashboard"
              >
                ← Back to Dashboard
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center">
                  <span className="text-4xl mr-3">🏛️</span>
                  Create DAO for {company?.name}
                </h1>
                <p className="text-gray-400 mt-1">Set up decentralized governance for your organization</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">DAO Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  maxLength={10}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Jurisdiction</label>
                <select
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  required
                >
                  <option value="Delaware, USA">Delaware, USA</option>
                  <option value="Wyoming, USA">Wyoming, USA</option>
                  <option value="Switzerland">Switzerland</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Marshall Islands">Marshall Islands</option>
                  <option value="Cayman Islands">Cayman Islands</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mission and Constitution */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Governance Framework</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mission Statement</label>
                <textarea
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  placeholder="Describe the purpose and goals of this DAO..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Constitution (Optional)</label>
                <textarea
                  value={formData.constitution}
                  onChange={(e) => setFormData({ ...formData, constitution: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  placeholder="Define the governance rules, voting mechanisms, and organizational structure..."
                />
              </div>
            </div>
          </div>

          {/* Roles and Members */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Initial Roles and Members</h2>
            <div className="space-y-4">
              {formData.roles.map((role, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => handleRoleChange(index, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:border-cyan-400 focus:outline-none"
                      placeholder="e.g., Founder, Member, Advisor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Wallet Address</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={formData.roleHolders[index] || ''}
                        onChange={(e) => handleRoleHolderChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:border-cyan-400 focus:outline-none font-mono text-sm"
                        placeholder="0x..."
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
                </div>
              ))}
              
              <button
                type="button"
                onClick={addRole}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border-2 border-dashed border-gray-500 transition-colors"
              >
                + Add Another Role
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Creating DAO...</span>
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
  );
}