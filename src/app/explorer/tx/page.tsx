"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Hash, Clock, ArrowRight, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  timestamp: number;
  transactionIndex: number;
  type: number;
  status: number;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  latestBlock: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  });
  const [latestBlock, setLatestBlock] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async (page = 1, showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/tx?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data: TransactionsResponse = await response.json();
      setTransactions(data.transactions);
      setPagination(data.pagination);
      setLatestBlock(data.latestBlock);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, []);

  const formatEther = (wei: string) => {
    try {
      const eth = Number(wei) / 1e18;
      return eth.toFixed(6);
    } catch {
      return '0.000000';
    }
  };

  const formatGasPrice = (gasPrice: string) => {
    try {
      const gwei = Number(gasPrice) / 1e9;
      return gwei.toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const shortenHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const handleRefresh = () => {
    fetchTransactions(currentPage, true);
  };

  const handlePageChange = (newPage: number) => {
    fetchTransactions(newPage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-600 mt-2">Latest blockchain transactions</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-red-500 mb-4">
              <Hash className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Transactions</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchTransactions(currentPage)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center mb-2">
              <Link href="/explorer" className="text-blue-600 hover:underline mr-4">
                ← Back to Explorer
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-2">
              Latest blockchain transactions • Block #{latestBlock.toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction Hash
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Block
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gas Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.hash} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/explorer/tx/${tx.hash}`}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                      >
                        {shortenHash(tx.hash)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/explorer/block/${tx.blockNumber}`}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                      >
                        {tx.blockNumber.toLocaleString()}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/explorer/address/${tx.from}`}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                      >
                        {shortenAddress(tx.from)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.to ? (
                        <Link
                          href={`/explorer/address/${tx.to}`}
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        >
                          {shortenAddress(tx.to)}
                        </Link>
                      ) : (
                        <span className="text-gray-500 text-sm italic">Contract Creation</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {formatEther(tx.value)} ETH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {formatGasPrice(tx.gasPrice)} gwei
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={formatTimestamp(tx.timestamp)}>
                      {formatTimeAgo(tx.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <Hash className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
              <p className="text-gray-600">There are no transactions to display at this time.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {pagination.page} • {transactions.length} transactions
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {currentPage}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasMore}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}