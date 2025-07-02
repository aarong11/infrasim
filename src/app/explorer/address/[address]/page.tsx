"use client";
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWebAuthnWallet } from '@/providers/UnifiedWalletProvider';

export default function AddressPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const address = params.address as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(Number(searchParams.get('page') || 1));
  
  // Get wallet context to check if this is the user's address
  const { wallet, isAuthenticated } = useWebAuthnWallet();
  const isMyWallet = isAuthenticated && wallet && wallet.address.toLowerCase() === address.toLowerCase();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/address/${address}?page=${page}&limit=20`);
        if (!res.ok) throw new Error(res.status === 404 ? 'Address not found' : 'Failed to fetch');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [address, page]);

  const formatEther = (wei: string) => Number(wei) / 1e18;
  const formatTimestamp = (ts: number) => new Date(ts * 1000).toLocaleString();
  const shorten = (h: string) => `${h.slice(0, 10)}...${h.slice(-8)}`;

  if (loading) return <div className="p-6 text-gray-900">Loading...</div>;
  if (error || !data) return <div className="p-6 text-red-600 font-medium">Error: {error}</div>;

  const txs = data.transactions || [];
  const totalPages = data.totalPages;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link href="/explorer/blocks" className="text-blue-600 hover:underline mr-4 font-medium">← Back</Link>
            <h1 className="text-2xl font-bold text-gray-900">Address {shorten(address)}</h1>
            {isMyWallet && (
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM13.7071 8.70711C14.0976 8.31658 14.0976 7.68342 13.7071 7.29289C13.3166 6.90237 12.6834 6.90237 12.2929 7.29289L9 10.5858L7.70711 9.29289C7.31658 8.90237 6.68342 8.90237 6.29289 9.29289C5.90237 9.68342 5.90237 10.3166 6.29289 10.7071L8.29289 12.7071C8.68342 13.0976 9.31658 13.0976 9.70711 12.7071L13.7071 8.70711Z" clipRule="evenodd" />
                </svg>
                My Wallet
              </span>
            )}
          </div>
          
          {isMyWallet && (
            <div className="flex items-center gap-2">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Manage Wallet
              </Link>
            </div>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Balance</label>
            <p className="font-mono text-lg text-gray-900 font-semibold">{data.balanceEth} ETH</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nonce</label>
            <p className="font-mono text-lg text-gray-900 font-semibold">{data.nonce}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
            <p className="font-mono text-lg text-gray-900 font-semibold">{data.isContract ? 'Contract' : 'Externally Owned'}</p>
          </div>
          {data.isContract && (
            <div className="col-span-1 sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Code</label>
              <p className="font-mono break-all text-sm mt-1 text-gray-800 bg-gray-100 p-3 rounded border">{data.code}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Transactions ({data.totalTransactions})</h2>
            <div>
              <button 
                onClick={() => setPage(page)} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Hash</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Block</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Age</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {txs.map((tx: any) => (
                  <tr key={tx.hash} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">
                      <Link href={`/explorer/tx/${tx.hash}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                        {shorten(tx.hash)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{tx.type}</td>
                    <td className="px-4 py-3 font-mono text-gray-900 font-medium">{formatEther(tx.value).toFixed(6)} ETH</td>
                    <td className="px-4 py-3">
                      <Link href={`/explorer/block/${tx.blockNumber}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium">
                        {tx.blockNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{formatTimestamp(tx.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        tx.status === 1 ? 'bg-green-100 text-green-800' : 
                        tx.status === 0 ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tx.status === 1 ? 'Success' : tx.status === 0 ? 'Failed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 p-4 border-t border-gray-200">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))} 
                disabled={page <= 1} 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 font-medium transition-colors disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-900 font-medium">Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(Math.min(totalPages, page + 1))} 
                disabled={page >= totalPages} 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 font-medium transition-colors disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}