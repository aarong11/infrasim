import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DAOInfo {
  id: number;
  name: string;
  symbol: string;
  jurisdiction: string;
  mission: string;
  constitution: string;
  creator: string;
  members: string[];
  roles: string[];
}

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
  const [daoInfo, setDAOInfo] = useState<DAOInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (daoContractAddress) {
      loadDAOInfo();
    }
  }, [daoContractAddress]);

  const loadDAOInfo = async () => {
    if (!daoContractAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get',
          contractAddress: daoContractAddress,
          companyId 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch DAO information');
      }

      const data = await response.json();
      if (data.success) {
        setDAOInfo(data.dao);
      } else {
        throw new Error(data.error || 'Failed to load DAO');
      }
    } catch (err) {
      console.error('Error loading DAO:', err);
      setError(err instanceof Error ? err.message : 'Failed to load DAO');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDAO = () => {
    // Navigate to DAO creation page with company context using Next.js router
    router.push(`/company/${companyId}/dao/create`);
  };

  const handleViewDAO = () => {
    // Navigate to DAO details page
    router.push(`/company/${companyId}/dao/${daoInfo?.id || daoContractAddress}`);
  };

  if (loading) {
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

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">🏛️</span>
        DAO Information
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {daoInfo ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300">DAO Name</label>
              <p className="text-white bg-gray-700 p-2 rounded mt-1">{daoInfo.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">Symbol</label>
              <p className="text-white bg-gray-700 p-2 rounded mt-1">{daoInfo.symbol}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">Jurisdiction</label>
              <p className="text-white bg-gray-700 p-2 rounded mt-1">{daoInfo.jurisdiction}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">Members</label>
              <p className="text-white bg-gray-700 p-2 rounded mt-1">{daoInfo.members.length} members</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300">Mission</label>
            <p className="text-white bg-gray-700 p-3 rounded mt-1">{daoInfo.mission}</p>
          </div>

          {daoInfo.roles.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-300">Roles</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {daoInfo.roles.map((role, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleViewDAO}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors flex items-center space-x-2"
            >
              <span>👁️</span>
              <span>View DAO Details</span>
            </button>
            <Link
              href={`/company/${companyId}/dao/${daoInfo.id}/manage`}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center space-x-2"
            >
              <span>⚙️</span>
              <span>Manage DAO</span>
            </Link>
          </div>
        </div>
      ) : daoContractAddress ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h4 className="text-lg text-gray-400 mb-2">DAO Contract Found</h4>
          <p className="text-gray-500 mb-4">
            This company has a DAO contract address but we couldn't load the details.
          </p>
          <div className="bg-gray-700 p-2 rounded mb-4">
            <code className="text-cyan-400 text-sm font-mono break-all">
              {daoContractAddress}
            </code>
          </div>
          <button
            onClick={loadDAOInfo}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Retry Loading DAO
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏗️</div>
          <h4 className="text-lg text-gray-400 mb-2">No DAO Found</h4>
          <p className="text-gray-500 mb-6">
            {companyName} doesn't have a DAO yet. Create one to enable decentralized governance.
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