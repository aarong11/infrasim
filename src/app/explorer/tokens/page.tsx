'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Coins, ExternalLink, Copy, CheckCircle } from 'lucide-react';

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  type: 'ERC20' | 'Native';
  deployedAt?: string;
}

interface TokensResponse {
  success: boolean;
  tokens: TokenInfo[];
  totalTokens: number;
  error?: string;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tokens');
      const data: TokensResponse = await response.json();
      
      if (data.success) {
        setTokens(data.tokens);
      } else {
        setError(data.error || 'Failed to fetch tokens');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
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

  const formatSupply = (totalSupply: string, decimals: number) => {
    if (totalSupply === 'N/A') return 'N/A';
    
    try {
      const supply = BigInt(totalSupply);
      const divisor = BigInt(10 ** decimals);
      const formatted = Number(supply) / Number(divisor);
      return formatted.toLocaleString();
    } catch {
      return totalSupply;
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTokenIcon = (type: string) => {
    return type === 'Native' ? '⚡' : '🪙';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Tokens</h1>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Tokens</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={fetchTokens}
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
            <h1 className="text-3xl font-bold text-gray-900">Tokens</h1>
            <p className="text-gray-600 mt-2">
              {tokens.length} token{tokens.length !== 1 ? 's' : ''} found on the network
            </p>
          </div>
          <button
            onClick={fetchTokens}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Supply
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Decimals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tokens.map((token, index) => (
                  <tr key={token.address} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getTokenIcon(token.type)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {token.name}
                          </div>
                          {token.deployedAt && (
                            <div className="text-xs text-gray-500">
                              Deployed: {new Date(token.deployedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {token.symbol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {token.type === 'Native' ? (
                          <span className="text-sm text-gray-500 font-mono">Native Token</span>
                        ) : (
                          <>
                            <Link 
                              href={`/explorer/address/${token.address}`}
                              className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                            >
                              {shortenAddress(token.address)}
                            </Link>
                            <button
                              onClick={() => copyToClipboard(token.address)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy address"
                            >
                              {copiedAddress === token.address ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <Link 
                              href={`/explorer/token/${token.address}`}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="View token details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {formatSupply(token.totalSupply, token.decimals)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {token.decimals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        token.type === 'Native' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {token.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {tokens.length === 0 && (
          <div className="text-center py-12">
            <Coins className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tokens found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No token contracts have been deployed on this network yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}