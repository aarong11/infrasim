'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  transactionCount: number;
}

interface BlocksResponse {
  blocks: Block[];
  totalBlocks: number;
  currentPage: number;
  totalPages: number;
}

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBlocks = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blocks?page=${page}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch blocks');
      
      const data: BlocksResponse = await response.json();
      setBlocks(data.blocks);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks(currentPage);
  }, [currentPage]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return {
      relative: `${Math.floor((Date.now() - date.getTime()) / 1000)}s ago`,
      absolute: date.toLocaleString()
    };
  };

  const formatGas = (gas: string) => {
    return Number(gas).toLocaleString();
  };

  const shortenHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (loading && blocks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Blocks</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Blocks</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={() => fetchBlocks(currentPage)}
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
          <h1 className="text-3xl font-bold text-gray-900">Blocks</h1>
          <button
            onClick={() => fetchBlocks(currentPage)}
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
                    Block
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Txn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gas Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gas Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miner
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blocks.map((block) => {
                  const timeInfo = formatTimestamp(block.timestamp);
                  const gasUsedPercent = ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(1);
                  
                  return (
                    <tr key={block.number} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/explorer/block/${block.number}`}
                          className="text-blue-600 hover:text-blue-800 font-mono"
                        >
                          {block.number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={timeInfo.absolute}>
                        {timeInfo.relative}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {block.transactionCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-mono">{formatGas(block.gasUsed)}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ width: `${Math.min(100, Number(gasUsedPercent))}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{gasUsedPercent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {formatGas(block.gasLimit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Link 
                          href={`/explorer/address/${block.miner}`}
                          className="text-blue-600 hover:text-blue-800 font-mono"
                        >
                          {shortenHash(block.miner)}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
            >
              Previous
            </button>
            
            <span className="text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}