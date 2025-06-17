'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ExternalLink, Copy, CheckCircle, Shield, Code } from 'lucide-react';

interface ContractInfo {
  address: string;
  name: string;
  type: string;
  deployedAt?: string;
  deployer?: string;
  bytecode?: string;
  verified: boolean;
  metadata?: any;
}

interface ContractsResponse {
  success: boolean;
  contracts: ContractInfo[];
  totalContracts: number;
  error?: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contracts');
      const data: ContractsResponse = await response.json();
      
      if (data.success) {
        setContracts(data.contracts);
      } else {
        setError(data.error || 'Failed to fetch contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getContractIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'erc20 token':
        return '🪙';
      case 'bridge/vault contract':
        return '🌉';
      case 'erc721':
      case 'nft':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'erc20 token':
        return 'bg-blue-100 text-blue-800';
      case 'bridge/vault contract':
        return 'bg-purple-100 text-purple-800';
      case 'erc721':
      case 'nft':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Smart Contracts</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Smart Contracts</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={fetchContracts}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Smart Contracts</h1>
            <p className="text-gray-600 mt-2">
              {contracts.length} contract{contracts.length !== 1 ? 's' : ''} deployed on the network
            </p>
          </div>
          <button
            onClick={fetchContracts}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Deployer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Deployed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract, index) => (
                  <tr key={contract.address} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getContractIcon(contract.type)}</span>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {contract.name}
                          </div>
                          {contract.metadata?.description && (
                            <div className="text-xs text-gray-600">
                              {contract.metadata.description}
                            </div>
                          )}
                          {contract.metadata?.symbol && (
                            <div className="text-xs text-blue-600 font-mono">
                              {contract.metadata.symbol}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getTypeColor(contract.type)}`}>
                        {contract.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Link 
                          href={`/explorer/address/${contract.address}`}
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm font-medium"
                        >
                          {shortenAddress(contract.address)}
                        </Link>
                        <button
                          onClick={() => copyToClipboard(contract.address)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy address"
                        >
                          {copiedAddress === contract.address ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <Link 
                          href={`/explorer/token/${contract.address}`}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="View contract details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contract.deployer ? (
                        <Link 
                          href={`/explorer/address/${contract.deployer}`}
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        >
                          {shortenAddress(contract.deployer)}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contract.deployedAt ? (
                        <div>
                          <div className="font-medium">
                            {new Date(contract.deployedAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(contract.deployedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          contract.verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {contract.verified ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <Code className="w-3 h-3 mr-1" />
                              Unverified
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contract Metadata Cards */}
        {contracts.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contracts.map((contract) => (
              <div key={`card-${contract.address}`} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">{getContractIcon(contract.type)}</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{contract.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(contract.type)}`}>
                      {contract.type}
                    </span>
                  </div>
                </div>
                
                {contract.metadata && (
                  <div className="space-y-2 text-sm">
                    {contract.metadata.symbol && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Symbol:</span>
                        <span className="font-mono font-bold text-gray-900">{contract.metadata.symbol}</span>
                      </div>
                    )}
                    {contract.metadata.decimals !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Decimals:</span>
                        <span className="font-mono text-gray-900">{contract.metadata.decimals}</span>
                      </div>
                    )}
                    {contract.metadata.totalSupply && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Supply:</span>
                        <span className="font-mono text-gray-900">
                          {contract.metadata.decimals 
                            ? (Number(contract.metadata.totalSupply) / Math.pow(10, contract.metadata.decimals)).toLocaleString()
                            : contract.metadata.totalSupply
                          }
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link 
                    href={`/explorer/address/${contract.address}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Contract Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {contracts.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contracts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No smart contracts have been deployed on this network yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}