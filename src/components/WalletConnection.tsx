import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useDisconnect } from 'wagmi'

export const WalletConnection: React.FC = () => {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({
    address: address,
  })
  const { disconnect } = useDisconnect()

  return (
    <div className="flex items-center gap-4">
      <ConnectButton />
      
      {isConnected && address && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          {balance && (
            <span className="text-gray-500">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Example usage in your components:
/*
import { WalletConnection } from './WalletConnection'

// In your component JSX:
<WalletConnection />
*/