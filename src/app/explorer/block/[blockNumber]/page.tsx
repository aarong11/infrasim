'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  status: number;
}

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas?: string;
  miner: string;
  difficulty: string;
  size: number;
  parentHash: string;
  nonce: string;
  extraData: string;
  transactions: Transaction[];
  transactionCount: number;
}

export default function BlockDetailPage() {
  const params = useParams();
  const blockNumber = params.blockNumber as string;
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/block/${blockNumber}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Block not found');
          }
          throw new Error('Failed to fetch block');
        }
        
        const data: Block = await response.json();
        setBlock(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (blockNumber) {
      fetchBlock();
    }
  }, [blockNumber]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatEther = (wei: string) => {
    try {
      return (Number(wei) / 10**18).toFixed(6);
    } catch {
      return '0';
    }
  };

  const shortenHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !block) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Block Details</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">Error: {error}</p>
            <Link
              href="/explorer/blocks"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Blocks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <Link
            href="/explorer/blocks"
            className="text-blue-600 hover:text-blue-800 mr-4"
          >
            ← Back to Blocks
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Block #{block.number}</h1>
        </div>

        {/* Block Overview */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Block Overview</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Block Height</label>
                  <p className="mt-1 text-lg font-mono text-gray-900">{block.number}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Timestamp</label>
                  <p className="mt-1 text-lg text-gray-900">{formatTimestamp(block.timestamp)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Transactions</label>
                  <p className="mt-1 text-lg text-gray-900">{block.transactionCount}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Miner</label>
                  <div className="mt-1 flex items-center">
                    <Link
                      href={`/explorer/address/${block.miner}`}
                      className="text-blue-600 hover:text-blue-800 font-mono"
                    >
                      {block.miner}
                    </Link>
                    <button
                      onClick={() => copyToClipboard(block.miner)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Block Hash</label>
                  <div className="mt-1 flex items-center">
                    <p className="text-lg font-mono text-gray-900 break-all">{block.hash}</p>
                    <button
                      onClick={() => copyToClipboard(block.hash)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Parent Hash</label>
                  <div className="mt-1 flex items-center">
                    <Link
                      href={`/explorer/block/${block.number - 1}`}
                      className="text-blue-600 hover:text-blue-800 font-mono break-all"
                    >
                      {block.parentHash}
                    </Link>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Gas Used / Limit</label>
                  <div className="mt-1">
                    <p className="text-lg text-gray-900">
                      {Number(block.gasUsed).toLocaleString()} / {Number(block.gasLimit).toLocaleString()}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (Number(block.gasUsed) / Number(block.gasLimit)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2)}% utilized
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Block Size</label>
                  <p className="mt-1 text-lg text-gray-900">{block.size.toLocaleString()} bytes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Transactions ({block.transactionCount})
            </h2>
          </div>
          
          {block.transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No transactions in this block
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Hash
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value (ETH)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gas Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {block.transactions.map((tx) => (
                    <tr key={tx.hash} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/explorer/tx/${tx.hash}`}
                          className="text-blue-600 hover:text-blue-800 font-mono"
                        >
                          {shortenHash(tx.hash)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/explorer/address/${tx.from}`}
                          className="text-blue-600 hover:text-blue-800 font-mono"
                        >
                          {shortenHash(tx.from)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tx.to ? (
                          <Link
                            href={`/explorer/address/${tx.to}`}
                            className="text-blue-600 hover:text-blue-800 font-mono"
                          >
                            {shortenHash(tx.to)}
                          </Link>
                        ) : (
                          <span className="text-gray-500 italic">Contract Creation</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {formatEther(tx.value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {tx.gasUsed ? Number(tx.gasUsed).toLocaleString() : 'Pending'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 1 
                            ? 'bg-green-100 text-green-800' 
                            : tx.status === 0 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tx.status === 1 ? 'Success' : tx.status === 0 ? 'Failed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}