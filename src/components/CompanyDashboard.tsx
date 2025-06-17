'use client';

import React, { useState, useEffect } from 'react';
import { navigateToIframe, isIframeMode } from '../utils/iframe-navigation';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { CompanyMemoryRecord } from '../types/infrastructure';
import { DAOSection } from './DAOSection';

interface CompanyDashboardProps {
  companyId: string;
}

interface DashboardAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

const dashboardActions: DashboardAction[] = [
  {
    id: 'details',
    title: 'View/Edit Company Details',
    description: 'Manage company information, description, and metadata',
    icon: '🏢',
    route: 'details',
    color: 'bg-blue-600 hover:bg-blue-700'
  },
  {
    id: 'roles',
    title: 'View/Edit Roles',
    description: 'Manage company roles, permissions, and organizational structure',
    icon: '👥',
    route: 'roles',
    color: 'bg-green-600 hover:bg-green-700'
  },
  {
    id: 'events',
    title: 'View/Edit Events',
    description: 'Track company events, milestones, and activity timeline',
    icon: '📅',
    route: 'events',
    color: 'bg-purple-600 hover:bg-purple-700'
  },
  {
    id: 'infrastructure',
    title: 'View Infrastructure',
    description: 'Explore and manage company infrastructure components',
    icon: '🔧',
    route: 'infrastructure',
    color: 'bg-cyan-600 hover:bg-cyan-700'
  }
];

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ companyId }) => {
  const [company, setCompany] = useState<CompanyMemoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inIframe, setInIframe] = useState(false);
  const vectorService = new ClientVectorMemoryService();

  useEffect(() => {
    setInIframe(isIframeMode());
    loadCompany();
  }, [companyId]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const companies = await vectorService.getAllCompaniesFromMemory();
      const foundCompany = companies.find(c => c.id === companyId);
      
      if (foundCompany) {
        setCompany(foundCompany);
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

  const handleActionClick = (action: DashboardAction) => {
    if (isIframeMode()) {
      navigateToIframe(`/company/${companyId}/${action.route}`);
    } else {
      window.location.href = `/company/${companyId}/${action.route}`;
    }
  };

  const handleBackToHome = () => {
    if (isIframeMode()) {
      navigateToIframe('/');
    } else {
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-xl text-gray-400">Loading company dashboard...</h3>
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
            onClick={handleBackToHome}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Only show header if NOT in iframe mode */}
      {!inIframe && (
        <div className="bg-gray-800 border-b border-gray-700 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToHome}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Back to Home"
                >
                  ← Back
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center">
                    <span className="text-4xl mr-3">🏢</span>
                    {company.name}
                  </h1>
                  <p className="text-gray-400 mt-1">{company.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {company.sectorTags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content - adjust padding based on iframe mode */}
      <div className={`max-w-6xl mx-auto ${inIframe ? 'p-6' : 'p-6'}`}>
        {/* Show title in iframe mode since no header */}
        {inIframe && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white flex items-center mb-2">
              <span className="text-4xl mr-3">🏢</span>
              {company.name}
            </h1>
            <p className="text-gray-400 mb-4">{company.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {company.sectorTags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white mb-2">Company Management</h2>
          <p className="text-gray-400">Choose an action to manage different aspects of {company.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardActions.map((action) => (
            <div
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`${action.color} p-6 rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg`}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{action.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
                <p className="text-sm text-gray-200">{action.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* DAO Section */}
        <div className="mt-8">
          <DAOSection
            companyId={companyId}
            daoContractAddress={company.daoContractAddress}
            companyName={company.name}
            onDAOCreated={(daoId) => {
              console.log('DAO created with ID:', daoId);
              // Refresh company data to get updated DAO contract address
              loadCompany();
            }}
          />
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Quick Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{company.services.length}</div>
              <div className="text-gray-400">Services</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{company.infrastructure?.length || 0}</div>
              <div className="text-gray-400">Infrastructure Components</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{company.sectorTags.length}</div>
              <div className="text-gray-400">Sector Tags</div>
            </div>
          </div>
        </div>

        {/* Services Overview */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Services</h3>
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
        </div>
      </div>
    </div>
  );
};