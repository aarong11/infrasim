import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { createConfig, http } from 'wagmi'
import { defineChain } from 'viem'

// Define custom Hardhat chain
export const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Local Explorer',
      url: 'http://localhost:4000', // Adjust if you have a local block explorer
    },
  },
  testnet: true,
})

// Create wagmi config with only custom RPC
export const wagmiConfig = createConfig({
  chains: [hardhatLocal],
  transports: {
    [hardhatLocal.id]: http('http://localhost:8545'),
  },
  ssr: true, // Enable SSR for Next.js
})

// RainbowKit configuration with WalletConnect v2 and MetaMask
export const rainbowKitConfig = getDefaultConfig({
  appName: 'InfraSim',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id', // You'll need to get this from WalletConnect Cloud
  chains: [hardhatLocal],
  transports: {
    [hardhatLocal.id]: http('http://localhost:8545'),
  },
  ssr: true,
})

// Custom transport configuration (for future JWT auth support)
export const createCustomTransport = (url: string, authToken?: string) => {
  return http(url, {
    // Future: Add JWT auth headers here
    // fetchOptions: {
    //   headers: {
    //     'Authorization': `Bearer ${authToken}`,
    //   },
    // },
  })
}

// Future wallet additions - uncomment and customize as needed:
/*
import {
  coinbaseWallet,
  ledgerWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets'

export const customWalletList = {
  groupName: 'Recommended',
  wallets: [
    injectedWallet,
    metaMaskWallet,
    walletConnectWallet,
    // coinbaseWallet,
    // ledgerWallet, 
    // trustWallet,
    // Add your custom built-in wallet here
  ],
}
*/