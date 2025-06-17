# RainbowKit + wagmi Setup Guide

## 🎯 Setup Complete

Your Next.js app is now configured with RainbowKit and wagmi for local Hardhat development. Here's what was implemented:

### ✅ Current Features

1. **Custom Hardhat Chain Configuration** (Chain ID: 31337)
   - Native ETH token support
   - Custom RPC endpoint: `http://localhost:8545`
   - No external providers (Alchemy/Infura disabled)

2. **Wallet Support**
   - MetaMask (injected wallet)
   - WalletConnect v2 support
   - Ready for offline use with your Docker setup

3. **UI Integration**
   - Wallet connection button in top menu bar
   - Balance display for connected wallets
   - Example blockchain interaction component

## 🔧 Required Setup Steps

### 1. Get WalletConnect Project ID
1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy your Project ID
4. Create `.env.local` file:
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id-here
```

### 2. Start Your Local Environment
```bash
# Start your Hardhat node (make sure it's running on port 8545)
# Start your RPC relay
# Then start your Next.js app
npm run dev
```

## 📁 Files Created/Modified

- `src/config/wagmi.ts` - wagmi and RainbowKit configuration
- `src/app/layout.tsx` - Provider setup
- `src/components/WalletConnection.tsx` - Wallet UI component
- `src/components/TopMenuBar.tsx` - Added wallet to menu
- `src/components/BlockchainExample.tsx` - Example interactions
- `.env.example` - Environment template

## 🔮 Future Enhancements

### Adding More Wallets
Uncomment and customize the wallet list in `wagmi.ts`:

```typescript
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  ledgerWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets'

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      injectedWallet,
      metaMaskWallet,
      walletConnectWallet,
      coinbaseWallet,
      ledgerWallet,
      trustWallet,
      // Add your custom built-in wallet here
    ],
  },
])
```

### JWT Authentication for RPC
Update the transport configuration:

```typescript
export const createAuthenticatedTransport = (url: string, token: string) => {
  return http(url, {
    fetchOptions: {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    },
  })
}
```

### Multi-Network Support
Add more local networks to your chain configuration:

```typescript
export const hardhatLocal2 = defineChain({
  id: 31338,
  name: 'Hardhat Local 2',
  // ... configuration
})

export const wagmiConfig = createConfig({
  chains: [hardhatLocal, hardhatLocal2],
  transports: {
    [hardhatLocal.id]: http('http://localhost:8545'),
    [hardhatLocal2.id]: http('http://localhost:8547'),  // Updated port since relay is removed
  },
})
```

### Built-in Wallet Integration
Create a custom wallet connector for your built-in wallet:

```typescript
import { Wallet } from '@rainbow-me/rainbowkit'

export const builtInWallet = (): Wallet => ({
  id: 'built-in',
  name: 'Built-in Wallet',
  iconUrl: '/wallet-icon.svg',
  iconBackground: '#fff',
  createConnector: () => {
    // Implement your custom signer logic here
    return createConnector(/* your connector implementation */)
  },
})
```

## 🧪 Testing the Setup

1. **Connect Wallet**: Click the "Connect Wallet" button in the top menu
2. **Check Balance**: Your ETH balance should display next to your address
3. **Test Transactions**: Use the BlockchainExample component to send test transactions
4. **Verify Network**: Ensure you're connected to "Hardhat Local" (Chain ID: 31337)

## 🔒 Security Notes

- The setup is configured for local development only
- No mainnet or testnet connections are enabled
- All transactions go through your custom RPC relay
- Ready for JWT authentication when needed

## 📖 Usage Examples

Import and use wagmi hooks in your components:

```typescript
import { useAccount, useBalance, useWriteContract } from 'wagmi'
import { parseEther } from 'viem'

// In your component:
const { address, isConnected } = useAccount()
const { data: balance } = useBalance({ address })
const { writeContract } = useWriteContract()
```

Your wallet integration is now ready for local blockchain development! 🎉