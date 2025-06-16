'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { CompanyMemoryRecord } from '../types/infrastructure';

interface CompanyDetailsProps {
  companyId: string;
}

export const CompanyDetails: React.FC<CompanyDetailsProps> = ({ companyId }) => {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyMemoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedCompany, setEditedCompany] = useState<CompanyMemoryRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const vectorService = new ClientVectorMemoryService();

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const companies = await vectorService.getAllCompaniesFromMemory();
      const foundCompany = companies.find(c => c.id === companyId);
      
      if (foundCompany) {
        setCompany(foundCompany);
        setEditedCompany(foundCompany);
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

  const handleSave = async () => {
    if (!editedCompany) return;
    
    setSaving(true);
    setError(null); // Clear any previous errors
    
    try {
      // Update the timestamp and prepare the company data for API submission
      const updatedCompany: CompanyMemoryRecord = {
        ...editedCompany,
        updatedAt: new Date() // Set current timestamp
      };
      
      // Call the API to persist changes
      await vectorService.updateCompanyInMemory(updatedCompany);
      
      // Update local state with the saved data
      setCompany(updatedCompany);
      setEditedCompany(updatedCompany);
      setEditing(false);
      
      console.log('✅ Company updated successfully:', updatedCompany.name);
    } catch (err) {
      console.error('Failed to save company:', err);
      setError(`Failed to save changes: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Don't exit editing mode on error so user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedCompany(company);
    setEditing(false);
  };

  const handleBackToDashboard = () => {
    router.push(`/company/${companyId}/dashboard`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-xl text-gray-400">Loading company details...</h3>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl text-gray-400 mb-2">Error</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleBackToDashboard}
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
                onClick={handleBackToDashboard}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to Dashboard"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-white">Company Details</h1>
            </div>
            <div className="flex space-x-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Edit Details
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={editedCompany?.name || ''}
                    onChange={(e) => setEditedCompany(prev => prev ? {...prev, name: e.target.value} : null)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  />
                ) : (
                  <p className="text-white bg-gray-700 p-3 rounded-lg">{company.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company ID</label>
                <p className="text-gray-400 bg-gray-700 p-3 rounded-lg font-mono text-sm">{company.id}</p>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              {editing ? (
                <textarea
                  value={editedCompany?.description || ''}
                  onChange={(e) => setEditedCompany(prev => prev ? {...prev, description: e.target.value} : null)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <p className="text-white bg-gray-700 p-3 rounded-lg">{company.description}</p>
              )}
            </div>
          </div>

          {/* Sector Tags */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Sector Tags</h2>
            {editing ? (
              <div>
                <input
                  type="text"
                  value={editedCompany?.sectorTags.join(', ') || ''}
                  onChange={(e) => setEditedCompany(prev => prev ? {...prev, sectorTags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)} : null)}
                  placeholder="Enter tags separated by commas"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                />
                <p className="text-sm text-gray-400 mt-1">Separate tags with commas</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {company.sectorTags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Services</h2>
            {editing ? (
              <div>
                <input
                  type="text"
                  value={editedCompany?.services.join(', ') || ''}
                  onChange={(e) => setEditedCompany(prev => prev ? {...prev, services: e.target.value.split(',').map(service => service.trim()).filter(Boolean)} : null)}
                  placeholder="Enter services separated by commas"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                />
                <p className="text-sm text-gray-400 mt-1">Separate services with commas</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {company.services.map((service, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-600 text-white rounded-full text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Additional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                <p className="text-gray-400 bg-gray-700 p-3 rounded-lg">{company.metadata?.industry || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Complexity</label>
                <p className="text-gray-400 bg-gray-700 p-3 rounded-lg">{company.metadata?.complexity || 'Not specified'}</p>
              </div>
            </div>
            
            {company.metadata?.compliance && company.metadata.compliance.length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Compliance</label>
                <div className="flex flex-wrap gap-2">
                  {company.metadata.compliance.map((comp, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-600 text-white rounded-full text-sm"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Timestamps</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Created</label>
                <p className="text-gray-400 bg-gray-700 p-3 rounded-lg font-mono text-sm">
                  {company.createdAt ? new Date(company.createdAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Updated</label>
                <p className="text-gray-400 bg-gray-700 p-3 rounded-lg font-mono text-sm">
                  {company.updatedAt ? new Date(company.updatedAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};