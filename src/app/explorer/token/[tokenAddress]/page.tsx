"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function TokenPage() {
  const params = useParams();
  const tokenAddress = params.tokenAddress as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        setLoading(true);
        const res = await fetch(`/api/token/${tokenAddress}`);
        if (!res.ok) throw new Error(res.status === 400 ? 'Token not found or invalid' : 'Failed to fetch');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchToken();
  }, [tokenAddress]);

  const shorten = (h: string) => `${h.slice(0, 10)}...${h.slice(-8)}`;
  const formatTimestamp = (ts: number) => new Date(ts * 1000).toLocaleString();

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !data) return <div className="p-6">Error: {error}</div>;

  const { name, symbol, decimals, totalSupplyFormatted, transfers, holders } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/explorer/blocks" className="text-blue-600 hover:underline mr-4">← Back</Link>
          <h1 className="text-2xl font-semibold">Token {symbol} ({ shorten(tokenAddress) })</h1>
        </div>
        <div className="bg-white shadow rounded p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <p className="text-lg font-mono mt-1">{name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Symbol</label>
            <p className="text-lg font-mono mt-1">{symbol}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Decimals</label>
            <p className="text-lg font-mono mt-1">{decimals}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Total Supply</label>
            <p className="text-lg font-mono mt-1">{totalSupplyFormatted}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Recent Transfers ({data.totalTransfers})</h2>
          </div>
          {transfers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No transfer events found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Tx Hash</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">From</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">To</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Block</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transfers.map((tx: any) => (
                    <tr key={tx.transactionHash} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono">
                        <Link href={`/explorer/tx/${tx.transactionHash}`} className="text-blue-600 hover:underline">{shorten(tx.transactionHash)}</Link>
                      </td>
                      <td className="px-4 py-2 font-mono">{shorten(tx.from)}</td>
                      <td className="px-4 py-2 font-mono">{shorten(tx.to)}</td>
                      <td className="px-4 py-2 font-mono">{tx.valueFormatted}</td>
                      <td className="px-4 py-2">
                        <Link href={`/explorer/block/${tx.blockNumber}`} className="text-blue-600 hover:underline font-mono">{tx.blockNumber}</Link>
                      </td>
                      <td className="px-4 py-2">{formatTimestamp(tx.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Top Holders</h2>
          </div>
          {holders.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No holders data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Address</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">% of Supply</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holders.map((h: any) => (
                    <tr key={h.address} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono break-all">
                        <Link href={`/explorer/address/${h.address}`} className="text-blue-600 hover:underline">{shorten(h.address)}</Link>
                      </td>
                      <td className="px-4 py-2 font-mono">{h.balanceFormatted}</td>
                      <td className="px-4 py-2">{h.percentage}%</td>
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