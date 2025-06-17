import React, { useState } from 'react'
import { useWebAuthnWallet } from './WebAuthnWalletProvider'
import { TransactionForm } from './TransactionForm'

// Example component showing blockchain interactions with WebAuthn secure wallet
export const BlockchainExample: React.FC = () => {
  const { wallet, isAuthenticated, provider } = useWebAuthnWallet()
  const [recentTransactions, setRecentTransactions] = useState<string[]>([])

  const handleTransactionSent = (txHash: string) => {
    setRecentTransactions(prev => [txHash, ...prev.slice(0, 4)]) // Keep last 5 transactions
  }

  if (!isAuthenticated || !wallet) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">Please authenticate with your WebAuthn secure wallet to interact with the blockchain.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Blockchain Interactions</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">Connected Address:</p>
          <p className="font-mono text-sm">{wallet.address}</p>
          <p className="text-sm text-gray-600 mt-2">Current Balance:</p>
          <p className="font-mono text-sm">{parseFloat(wallet.balance).toFixed(4)} ETH</p>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">WebAuthn Secure Wallet Features:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✓ Biometric authentication (WebAuthn)</li>
            <li>✓ AES-GCM encrypted storage</li>
            <li>✓ PBKDF2 key derivation (100k iterations)</li>
            <li>✓ 5-minute session timeout</li>
            <li>✓ No external dependencies</li>
            <li>✓ Fully offline operation</li>
          </ul>
        </div>
      </div>

      {/* Transaction Form */}
      <TransactionForm onTransactionSent={handleTransactionSent} />

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {recentTransactions.map((txHash, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Transaction {index + 1}:</p>
                <p className="font-mono text-xs break-all">{txHash}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Status */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Network Status</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Network:</span>
            <span className="font-medium">Hardhat Local (31337)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">RPC Endpoint:</span>
            <span className="font-mono text-sm">http://localhost:8545</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Connection Status:</span>
            <span className={`font-medium ${provider ? 'text-green-600' : 'text-red-600'}`}>
              {provider ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlockchainExample