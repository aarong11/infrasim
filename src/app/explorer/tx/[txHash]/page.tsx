"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function TxDetailPage() {
  const params = useParams();
  const txHash = params.txHash as string;
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTx() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tx/${txHash}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Transaction not found' : 'Failed to fetch');
        }
        setTx(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchTx();
  }, [txHash]);

  const formatEther = (wei: string) => (Number(wei) / 1e18).toFixed(6);
  const formatTimestamp = (ts: number) => new Date(ts * 1000).toLocaleString();
  const shorten = (h: string) => `${h.slice(0, 10)}...${h.slice(-8)}`;

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !tx) return <div className="p-6">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/explorer/tx" className="text-blue-600 hover:underline mr-4">← Back to Transactions</Link>
          <h1 className="text-2xl font-semibold">Transaction {shorten(tx.hash)}</h1>
        </div>
        <div className="bg-white shadow rounded p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-500">Hash</label>
            <p className="font-mono break-all">{tx.hash}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Block</label>
              <Link href={`/explorer/block/${tx.blockNumber}`} className="text-blue-600 hover:underline font-mono">{tx.blockNumber}</Link>
            </div>
            <div>
              <label className="text-sm text-gray-500">Timestamp</label>
              <p>{tx.timestamp ? formatTimestamp(tx.timestamp) : '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">From</label>
              <Link href={`/explorer/address/${tx.from}`} className="text-blue-600 hover:underline font-mono">{shorten(tx.from)}</Link>
            </div>
            <div>
              <label className="text-sm text-gray-500">To</label>
              {tx.to ? (
                <Link href={`/explorer/address/${tx.to}`} className="text-blue-600 hover:underline font-mono">{shorten(tx.to)}</Link>
              ) : <span className="italic">Contract Creation</span>}
            </div>
            <div>
              <label className="text-sm text-gray-500">Value</label>
              <p className="font-mono">{formatEther(tx.value)} ETH</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Status</label>
              <p>{tx.status === 1 ? 'Success' : tx.status === 0 ? 'Failed' : 'Pending'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Gas Used</label>
              <p className="font-mono">{tx.gasUsed ? Number(tx.gasUsed).toLocaleString() : '—'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Gas Price</label>
              <p className="font-mono">{tx.gasPrice ? Number(tx.gasPrice).toLocaleString() : '—'}</p>
            </div>
          </div>
          {tx.logs && tx.logs.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-2">Logs</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1 text-left text-xs text-gray-600">Index</th>
                      <th className="px-2 py-1 text-left text-xs text-gray-600">Address</th>
                      <th className="px-2 py-1 text-left text-xs text-gray-600">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.logs.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-1 text-sm">{idx}</td>
                        <td className="px-2 py-1 text-sm font-mono break-all">{log.address}</td>
                        <td className="px-2 py-1 text-sm font-mono break-all">{log.data}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}