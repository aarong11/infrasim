import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ethers } from 'ethers';

// Unified wallet types
export type WalletType = 'webauthn' | 'self-hosted' | 'external';

export interface BaseWallet {
  id: string;
  type: WalletType;
  address: string;
  balance: string;
  isConnected: boolean;
  isActive: boolean; // Currently selected wallet
  label?: string;
}

export interface WebAuthnWallet extends BaseWallet {
  type: 'webauthn';
  isAuthenticated: boolean;
  isRegistered: boolean;
  timeRemaining: number;
  usdcBalance?: string;
  addresses?: WalletAddress[];
  customTokens?: CustomToken[];
}

export interface SelfHostedWallet extends BaseWallet {
  type: 'self-hosted';
  privateKey: string;
  mnemonic: string;
}

export interface ExternalWallet extends BaseWallet {
  type: 'external';
  provider: string; // 'metamask', 'walletconnect', etc.
}

export type UnifiedWallet = WebAuthnWallet | SelfHostedWallet | ExternalWallet;

export interface WalletAddress {
  id: string;
  address: string;
  privateKey: string;
  label: string;
  balance: string;
  isDefault: boolean;
  derivationPath?: string;
}

export interface CustomToken {
  id: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  enabled: boolean;
}

export interface WalletConnection {
  isConnected: boolean;
  activeWalletId: string | null;
  provider: ethers.JsonRpcProvider | null;
  isWebAuthnSupported: boolean;
}

export interface WalletOperations {
  // Wallet Management
  addWallet: (wallet: UnifiedWallet) => void;
  removeWallet: (walletId: string) => void;
  setActiveWallet: (walletId: string) => void;
  updateWallet: (walletId: string, updates: Partial<UnifiedWallet>) => void;
  
  // Connection Management
  setConnection: (connection: Partial<WalletConnection>) => void;
  connectWallet: (walletId: string) => Promise<void>;
  disconnectWallet: (walletId: string) => void;
  disconnectAll: () => void;
  
  // WebAuthn Specific
  registerWebAuthnWallet: () => Promise<void>;
  authenticateWebAuthn: () => Promise<void>;
  clearWebAuthnWallet: () => void;
  
  // Self-Hosted Specific
  importSelfHostedWallet: (privateKeyOrMnemonic: string, label?: string) => Promise<void>;
  generateSelfHostedWallet: (label?: string) => Promise<void>;
  
  // Balance & Transaction Operations
  updateBalance: (walletId?: string) => Promise<void>;
  updateAllBalances: () => Promise<void>;
  sendTransaction: (to: string, value: string, walletId?: string) => Promise<string>;
  signMessage: (message: string, walletId?: string) => Promise<string>;
  
  // Utility
  getActiveWallet: () => UnifiedWallet | null;
  getWalletById: (walletId: string) => UnifiedWallet | null;
  getWalletsByType: (type: WalletType) => UnifiedWallet[];
  isAnyWalletConnected: () => boolean;
}

interface WalletStore {
  // State
  wallets: Record<string, UnifiedWallet>;
  connection: WalletConnection;
  
  // Operations
  operations: WalletOperations;
}

const initialConnection: WalletConnection = {
  isConnected: false,
  activeWalletId: null,
  provider: null,
  isWebAuthnSupported: false,
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      wallets: {},
      connection: initialConnection,
      
      operations: {
        // Wallet Management
        addWallet: (wallet: UnifiedWallet) => {
          set((state) => ({
            wallets: {
              ...state.wallets,
              [wallet.id]: wallet,
            },
          }));
        },
        
        removeWallet: (walletId: string) => {
          set((state) => {
            const { [walletId]: removed, ...remaining } = state.wallets;
            const newConnection = state.connection.activeWalletId === walletId
              ? { ...state.connection, activeWalletId: null, isConnected: false }
              : state.connection;
            
            return {
              wallets: remaining,
              connection: newConnection,
            };
          });
        },
        
        setActiveWallet: (walletId: string) => {
          const wallet = get().wallets[walletId];
          if (!wallet) return;
          
          set((state) => ({
            wallets: Object.fromEntries(
              Object.entries(state.wallets).map(([id, w]) => [
                id,
                { ...w, isActive: id === walletId },
              ])
            ),
            connection: {
              ...state.connection,
              activeWalletId: walletId,
              isConnected: wallet.isConnected,
            },
          }));
        },
        
        updateWallet: (walletId: string, updates: Partial<UnifiedWallet>) => {
          set((state) => {
            const existingWallet = state.wallets[walletId];
            if (!existingWallet) return state;
            
            // Type-safe update that preserves the wallet type
            const updatedWallet = { ...existingWallet, ...updates } as UnifiedWallet;
            
            return {
              ...state,
              wallets: {
                ...state.wallets,
                [walletId]: updatedWallet,
              },
            };
          });
        },
        
        // Connection Management
        setConnection: (connection: Partial<WalletConnection>) => {
          set((state) => ({
            connection: {
              ...state.connection,
              ...connection,
            },
          }));
        },
        
        connectWallet: async (walletId: string) => {
          const wallet = get().wallets[walletId];
          if (!wallet) return;
          
          // Update wallet connection status
          get().operations.updateWallet(walletId, { isConnected: true });
          get().operations.setActiveWallet(walletId);
          
          // Update balance
          await get().operations.updateBalance(walletId);
        },
        
        disconnectWallet: (walletId: string) => {
          get().operations.updateWallet(walletId, { 
            isConnected: false, 
            isActive: false 
          });
          
          const { connection } = get();
          if (connection.activeWalletId === walletId) {
            get().operations.setConnection({
              activeWalletId: null,
              isConnected: false,
            });
          }
        },
        
        disconnectAll: () => {
          set((state) => ({
            wallets: Object.fromEntries(
              Object.entries(state.wallets).map(([id, wallet]) => [
                id,
                { ...wallet, isConnected: false, isActive: false },
              ])
            ),
            connection: {
              ...state.connection,
              activeWalletId: null,
              isConnected: false,
            },
          }));
        },
        
        // WebAuthn Specific Operations
        registerWebAuthnWallet: async () => {
          // Implementation will be handled by WebAuthn adapter
          console.log('WebAuthn registration triggered');
        },
        
        authenticateWebAuthn: async () => {
          // Implementation will be handled by WebAuthn adapter
          console.log('WebAuthn authentication triggered');
        },
        
        clearWebAuthnWallet: () => {
          const webauthnWallets = get().operations.getWalletsByType('webauthn');
          webauthnWallets.forEach(wallet => {
            get().operations.removeWallet(wallet.id);
          });
        },
        
        // Self-Hosted Specific Operations
        importSelfHostedWallet: async (privateKeyOrMnemonic: string, label = 'Imported Wallet') => {
          try {
            let ethersWallet: ethers.Wallet | ethers.HDNodeWallet;
            let mnemonic = '';
            
            if (privateKeyOrMnemonic.includes(' ')) {
              // It's a mnemonic
              ethersWallet = ethers.Wallet.fromPhrase(privateKeyOrMnemonic);
              mnemonic = privateKeyOrMnemonic;
            } else {
              // It's a private key
              ethersWallet = new ethers.Wallet(privateKeyOrMnemonic);
              mnemonic = '';
            }
            
            const walletId = `self-hosted-${Date.now()}`;
            const selfHostedWallet: SelfHostedWallet = {
              id: walletId,
              type: 'self-hosted',
              address: ethersWallet.address,
              privateKey: ethersWallet.privateKey,
              mnemonic,
              balance: '0.0',
              isConnected: true,
              isActive: true,
              label,
            };
            
            get().operations.addWallet(selfHostedWallet);
            get().operations.setActiveWallet(walletId);
          } catch (error) {
            console.error('Failed to import wallet:', error);
            throw error;
          }
        },
        
        generateSelfHostedWallet: async (label = 'Generated Wallet') => {
          try {
            const ethersWallet = ethers.Wallet.createRandom();
            const walletId = `self-hosted-${Date.now()}`;
            
            const selfHostedWallet: SelfHostedWallet = {
              id: walletId,
              type: 'self-hosted',
              address: ethersWallet.address,
              privateKey: ethersWallet.privateKey,
              mnemonic: ethersWallet.mnemonic ? ethersWallet.mnemonic.phrase : '',
              balance: '0.0',
              isConnected: true,
              isActive: true,
              label,
            };
            
            get().operations.addWallet(selfHostedWallet);
            get().operations.setActiveWallet(walletId);
          } catch (error) {
            console.error('Failed to generate wallet:', error);
            throw error;
          }
        },
        
        // Balance & Transaction Operations
        updateBalance: async (walletId?: string) => {
          const targetWalletId = walletId || get().connection.activeWalletId;
          if (!targetWalletId) return;
          
          const wallet = get().wallets[targetWalletId];
          const { provider } = get().connection;
          
          if (!wallet || !provider) return;
          
          try {
            const balance = await provider.getBalance(wallet.address);
            const formattedBalance = ethers.formatEther(balance);
            
            get().operations.updateWallet(targetWalletId, {
              balance: formattedBalance,
            });
          } catch (error) {
            console.error('Failed to update balance:', error);
          }
        },
        
        updateAllBalances: async () => {
          const { wallets } = get();
          const connectedWallets = Object.values(wallets).filter(w => w.isConnected);
          
          await Promise.all(
            connectedWallets.map(wallet => 
              get().operations.updateBalance(wallet.id)
            )
          );
        },
        
        sendTransaction: async (to: string, value: string, walletId?: string) => {
          const targetWalletId = walletId || get().connection.activeWalletId;
          if (!targetWalletId) throw new Error('No wallet selected');
          
          const wallet = get().wallets[targetWalletId];
          const { provider } = get().connection;
          
          if (!wallet || !provider) throw new Error('Wallet or provider not available');
          
          // Implementation depends on wallet type
          if (wallet.type === 'self-hosted') {
            const selfHostedWallet = wallet as SelfHostedWallet;
            const ethersWallet = new ethers.Wallet(selfHostedWallet.privateKey, provider);
            const tx = await ethersWallet.sendTransaction({
              to,
              value: ethers.parseEther(value),
            });
            
            // Update balance after transaction
            await get().operations.updateBalance(targetWalletId);
            
            return tx.hash;
          }
          
          throw new Error(`Transaction not supported for wallet type: ${wallet.type}`);
        },
        
        signMessage: async (message: string, walletId?: string) => {
          const targetWalletId = walletId || get().connection.activeWalletId;
          if (!targetWalletId) throw new Error('No wallet selected');
          
          const wallet = get().wallets[targetWalletId];
          if (!wallet) throw new Error('Wallet not found');
          
          if (wallet.type === 'self-hosted') {
            const selfHostedWallet = wallet as SelfHostedWallet;
            const ethersWallet = new ethers.Wallet(selfHostedWallet.privateKey);
            return await ethersWallet.signMessage(message);
          }
          
          throw new Error(`Message signing not supported for wallet type: ${wallet.type}`);
        },
        
        // Utility Functions
        getActiveWallet: () => {
          const { connection, wallets } = get();
          return connection.activeWalletId ? wallets[connection.activeWalletId] : null;
        },
        
        getWalletById: (walletId: string) => {
          return get().wallets[walletId] || null;
        },
        
        getWalletsByType: (type: WalletType) => {
          return Object.values(get().wallets).filter(wallet => wallet.type === type);
        },
        
        isAnyWalletConnected: () => {
          return Object.values(get().wallets).some(wallet => wallet.isConnected);
        },
      },
    }),
    {
      name: 'infrasim-wallet-store',
      partialize: (state) => ({
        // Persist wallet configuration but not sensitive data
        wallets: Object.fromEntries(
          Object.entries(state.wallets).map(([id, wallet]) => [
            id,
            {
              ...wallet,
              // Don't persist sensitive data
              privateKey: wallet.type === 'self-hosted' ? '' : undefined,
              // Don't persist connection state
              isConnected: false,
              isActive: false,
            },
          ])
        ),
        connection: {
          ...initialConnection,
        },
      }),
    }
  )
);