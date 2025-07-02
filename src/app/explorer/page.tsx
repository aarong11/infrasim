'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, Clock, Hash, Coins, FileText } from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useIframeMode } from '../../utils/iframe-navigation';

interface SearchResult {
  type: 'address' | 'transaction' | 'block' | 'token';
  value: string;
  label: string;
  metadata?: any;
}

interface RecentItem {
  type: string;
  value: string;
  timestamp: number;
  label: string;
}

interface NetworkStats {
  latestBlock: number;
  gasPrice: string;
  totalTransactions: number;
  activeAddresses: number;
}

export default function ExplorerPage() {
  const isIframe = useIframeMode();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    latestBlock: 0,
    gasPrice: '0',
    totalTransactions: 0,
    activeAddresses: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchNetworkStats = async () => {
    try {
      const blocksResponse = await fetch('/api/blocks?limit=20');
      const blocksData = await blocksResponse.json();
      
      if (blocksData.blocks && blocksData.blocks.length > 0) {
        const latestBlock = blocksData.blocks[0];
        const totalTxCount = blocksData.blocks.reduce((sum: number, block: any) => sum + block.transactionCount, 0);
        
        const gasUsed = BigInt(latestBlock.gasUsed || '0');
        const gasLimit = BigInt(latestBlock.gasLimit || '0');
        const gasPrice = gasLimit > 0n ? (gasUsed * 20n) / gasLimit : 20n;
        
        setNetworkStats({
          latestBlock: latestBlock.number,
          gasPrice: `${gasPrice.toString()} gwei`,
          totalTransactions: totalTxCount,
          activeAddresses: Math.floor(totalTxCount * 1.5)
        });

        const recentItems: RecentItem[] = blocksData.blocks.slice(0, 5).map((block: any, index: number) => ({
          type: index % 3 === 0 ? 'transaction' : index % 3 === 1 ? 'block' : 'address',
          value: index % 3 === 1 ? block.number.toString() : block.hash,
          timestamp: block.timestamp * 1000,
          label: index % 3 === 0 ? `Block ${block.number} Transactions` : 
                 index % 3 === 1 ? `Block #${block.number}` : `Miner Activity`
        }));
        setRecentActivity(recentItems);
      }
    } catch (error) {
      console.error('Failed to fetch network stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkStats();
    const interval = setInterval(fetchNetworkStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const detectSearchType = (query: string): SearchResult[] => {
    const trimmed = query.trim();
    const results: SearchResult[] = [];

    if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
      results.push({
        type: 'transaction',
        value: trimmed,
        label: `Transaction: ${trimmed.slice(0, 10)}...${trimmed.slice(-8)}`
      });
    }

    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      results.push({
        type: 'address',
        value: trimmed,
        label: `Address: ${trimmed.slice(0, 10)}...${trimmed.slice(-8)}`
      });
    }

    if (/^\d+$/.test(trimmed)) {
      results.push({
        type: 'block',
        value: trimmed,
        label: `Block #${trimmed}`
      });
    }

    if (/^[A-Za-z]{2,10}$/.test(trimmed)) {
      const tokens = [
        { symbol: 'USDC', address: '0x5FbDB2315678afecb367f032d93F642f64180aa3', name: 'USD Coin' },
        { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', name: 'Ethereum' }
      ];
      
      tokens
        .filter(token => token.symbol.toLowerCase().includes(trimmed.toLowerCase()))
        .forEach(token => {
          results.push({
            type: 'token',
            value: token.address,
            label: `${token.symbol} - ${token.name}`,
            metadata: { symbol: token.symbol, name: token.name }
          });
        });
    }

    return results;
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    await new Promise(resolve => setTimeout(resolve, 300));

    const results = detectSearchType(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  const getSearchResultIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <Hash className="w-4 h-4" />;
      case 'address': return <FileText className="w-4 h-4" />;
      case 'block': return <Clock className="w-4 h-4" />;
      case 'token': return <Coins className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSearchResultLink = (result: SearchResult) => {
    switch (result.type) {
      case 'transaction': return `/explorer/tx/${result.value}`;
      case 'address': return `/explorer/address/${result.value}`;
      case 'block': return `/explorer/block/${result.value}`;
      case 'token': return `/explorer/token/${result.value}`;
      default: return '#';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="explorer-page">
      {/* Header */}
      <div className="explorer-header">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start mb-6">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold theme-text-primary mb-2">🔍 Blockchain Explorer</h1>
              <p className="text-lg theme-text-secondary mb-8">
                Search for addresses, transactions, blocks, and tokens
              </p>
            </div>
            {/* Only show ThemeToggle when not in iframe mode */}
            {!isIframe && (
              <div className="ml-4">
                <ThemeToggle />
              </div>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 theme-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Search by address, transaction hash, block number, or token symbol..."
                className="explorer-input w-full pl-12 pr-4 py-4 text-lg rounded-lg"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {showResults && (searchResults.length > 0 || isSearching) && (
              <div className="absolute top-full left-0 right-0 mt-2 explorer-card shadow-lg z-10 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center theme-text-secondary">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500 mx-auto"></div>
                    <span className="mt-2 block">Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((result, index) => (
                      <Link
                        key={index}
                        href={getSearchResultLink(result)}
                        className="flex items-center px-4 py-3 hover:bg-opacity-50 explorer-card transition-colors"
                        onClick={() => setShowResults(false)}
                      >
                        <div className="flex-shrink-0 mr-3 theme-text-tertiary">
                          {getSearchResultIcon(result.type)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium theme-text-primary">
                            {result.label}
                          </div>
                          <div className="text-xs theme-text-secondary capitalize">
                            {result.type}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 theme-text-tertiary" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center theme-text-secondary">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold theme-text-primary mb-6">Quick Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/explorer/blocks"
                className="explorer-card p-6 transition-all group"
              >
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-cyan-400 mr-4 group-hover:text-cyan-300" />
                  <div>
                    <h3 className="text-lg font-semibold theme-text-primary">Latest Blocks</h3>
                    <p className="theme-text-secondary">Browse recent blocks</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/explorer/tx"
                className="explorer-card p-6 transition-all group"
              >
                <div className="flex items-center">
                  <Hash className="w-8 h-8 text-green-400 mr-4 group-hover:text-green-300" />
                  <div>
                    <h3 className="text-lg font-semibold theme-text-primary">Transactions</h3>
                    <p className="theme-text-secondary">View transaction history</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/explorer/tokens"
                className="explorer-card p-6 transition-all group"
              >
                <div className="flex items-center">
                  <Coins className="w-8 h-8 text-yellow-400 mr-4 group-hover:text-yellow-300" />
                  <div>
                    <h3 className="text-lg font-semibold theme-text-primary">Tokens</h3>
                    <p className="theme-text-secondary">Explore token contracts</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/explorer/contracts"
                className="explorer-card p-6 transition-all group"
              >
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-purple-400 mr-4 group-hover:text-purple-300" />
                  <div>
                    <h3 className="text-lg font-semibold theme-text-primary">Smart Contracts</h3>
                    <p className="theme-text-secondary">Deployed contracts</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-2xl font-bold theme-text-primary mb-6">Recent Activity</h2>
            <div className="explorer-card">
              <div className="p-6">
                <h3 className="text-lg font-semibold theme-text-primary mb-4">Latest Activity</h3>
                <div className="space-y-4">
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 theme-bg-tertiary rounded"></div>
                      ))}
                    </div>
                  ) : (
                    recentActivity.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3 theme-text-tertiary">
                            {getSearchResultIcon(item.type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium theme-text-primary">
                              {item.label}
                            </div>
                            <div className="text-xs theme-accent-primary font-mono">
                              {item.type === 'block' ? `#${item.value}` : 
                               `${item.value.slice(0, 8)}...${item.value.slice(-6)}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs theme-text-tertiary">
                          {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Network Stats */}
            <div className="mt-6 explorer-card p-6">
              <h3 className="text-lg font-semibold theme-text-primary mb-4">⚡ Network Stats</h3>
              <div className="space-y-4">
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <div className="h-4 theme-bg-tertiary rounded w-1/2"></div>
                        <div className="h-4 theme-bg-tertiary rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="theme-text-secondary">Latest Block</span>
                      <span className="font-semibold text-cyan-400">#{networkStats.latestBlock.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="theme-text-secondary">Gas Price</span>
                      <span className="font-semibold text-green-400">{networkStats.gasPrice}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="theme-text-secondary">Recent Transactions</span>
                      <span className="font-semibold text-blue-400">{networkStats.totalTransactions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="theme-text-secondary">Estimated Addresses</span>
                      <span className="font-semibold text-purple-400">{networkStats.activeAddresses.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}