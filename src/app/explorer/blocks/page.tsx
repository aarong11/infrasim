'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { useIframeMode } from '../../../utils/iframe-navigation';
import { APIThrottler } from '../../../utils/api-throttler';

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  transactions: string[];
  transactionCount: number;
  size: number;
  difficulty: string;
  parentHash: string;
}

interface BlocksResponse {
  blocks: Block[];
  totalBlocks: number;
  currentPage: number;
  totalPages: number;
}

export default function BlocksPage() {
  const isIframe = useIframeMode();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // API throttling
  const apiThrottler = useRef(new APIThrottler({
    minInterval: 1000,
    maxBackoff: 30000,
    maxRetries: 3,
    baseBackoff: 2000
  }));

  const fetchBlocks = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiThrottler.current.throttledCall(
        () => fetch(`/api/blocks?page=${page}&limit=20`),
        `blocks-page-${page}`
      );
      
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

  const handleRefresh = () => {
    apiThrottler.current.reset(`blocks-page-${currentPage}`); // Reset backoff for manual refresh
    fetchBlocks(currentPage);
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
      <div className="explorer-page p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold theme-text-primary">Blocks</h1>
              <p className="theme-text-secondary mt-2">Latest blockchain blocks</p>
            </div>
            {!isIframe && <ThemeToggle />}
          </div>
          <div className="explorer-card shadow p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 theme-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="explorer-page p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold theme-text-primary">Blocks</h1>
            {!isIframe && <ThemeToggle />}
          </div>
          <div className="explorer-card p-6">
            <div className="text-center">
              <p className="text-red-400 mb-4">Error: {error}</p>
              <button 
                onClick={() => fetchBlocks(currentPage)}
                className="explorer-button px-4 py-2 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="explorer-page p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center mb-2">
              <Link href="/explorer" className="theme-accent-primary hover:underline mr-4">
                ← Back to Explorer
              </Link>
            </div>
            <h1 className="text-3xl font-bold theme-text-primary">Blocks</h1>
            <p className="theme-text-secondary mt-2">Latest blockchain blocks ({blocks.length} found)</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              className="explorer-button px-4 py-2 rounded transition-colors"
            >
              Refresh
            </button>
            {!isIframe && <ThemeToggle />}
          </div>
        </div>

        <div className="explorer-card shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="explorer-table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Block
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Txn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Gas Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Gas Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Miner
                  </th>
                </tr>
              </thead>
              <tbody className="explorer-table divide-y theme-border-primary">
                {blocks.map((block) => {
                  const timeInfo = formatTimestamp(block.timestamp);
                  const gasUsedPercent = ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(1);
                  
                  return (
                    <tr key={block.number} className="explorer-table-row">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/explorer/block/${block.number}`}
                          className="theme-accent-primary hover:opacity-80 font-mono"
                        >
                          {block.number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary" title={timeInfo.absolute}>
                        {timeInfo.relative}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-900 text-cyan-300">
                          {block.transactionCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary">
                        <div className="flex flex-col">
                          <span className="font-mono">{formatGas(block.gasUsed)}</span>
                          <div className="w-20 theme-bg-tertiary rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-cyan-400 h-1.5 rounded-full" 
                              style={{ width: `${Math.min(100, Number(gasUsedPercent))}%` }}
                            ></div>
                          </div>
                          <span className="text-xs theme-text-tertiary">{gasUsedPercent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary font-mono">
                        {formatGas(block.gasLimit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary">
                        <Link 
                          href={`/explorer/address/${block.miner}`}
                          className="theme-accent-primary hover:opacity-80 font-mono"
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
              className="explorer-button px-4 py-2 rounded disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            
            <span className="theme-text-secondary">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="explorer-button px-4 py-2 rounded disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}