import { useCallback, useEffect, useState } from 'react';
import { useWalletStore, UnifiedWallet, WalletType } from '../store/wallet-store';
import { WebAuthnWalletAdapter } from '../adapters/webauthn-wallet-adapter';
import { useAppStore } from '../store/app-store';

/**
 * Unified Wallet Manager Hook
 * Provides a single interface for all wallet operations across different wallet types
 */
export const useWalletManager = () => {
  const { wallets, connection, operations } = useWalletStore();
  const [webauthnAdapter] = useState(() => WebAuthnWalletAdapter.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize wallet system
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize provider
        operations.setConnection({
          provider: new (await import('ethers')).ethers.JsonRpcProvider('http://localhost:8545'),
          isWebAuthnSupported: webauthnAdapter.isWebAuthnSupported(),
        });

        // Check for existing WebAuthn wallet
        if (webauthnAdapter.isWalletRegistered()) {
          const currentWallet = webauthnAdapter.getCurrentWallet();
          if (currentWallet) {
            // Restore existing authenticated wallet
            await webauthnAdapter.authenticateWallet();
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize wallet system:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loading
      }
    };

    initialize();
  }, [operations, webauthnAdapter]);

  // WebAuthn timeout management
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (connection.isConnected) {
      interval = setInterval(() => {
        webauthnAdapter.updateTimeRemaining();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connection.isConnected, webauthnAdapter]);

  // Wallet Management
  const createWebAuthnWallet = useCallback(async () => {
    try {
      await webauthnAdapter.registerWallet();
    } catch (error) {
      console.error('Failed to create WebAuthn wallet:', error);
      throw error;
    }
  }, [webauthnAdapter]);

  const authenticateWebAuthn = useCallback(async () => {
    try {
      await webauthnAdapter.authenticateWallet();
    } catch (error) {
      console.error('Failed to authenticate WebAuthn wallet:', error);
      throw error;
    }
  }, [webauthnAdapter]);

  const createSelfHostedWallet = useCallback(async (label?: string) => {
    try {
      await operations.generateSelfHostedWallet(label);
    } catch (error) {
      console.error('Failed to create self-hosted wallet:', error);
      throw error;
    }
  }, [operations]);

  const importSelfHostedWallet = useCallback(async (privateKeyOrMnemonic: string, label?: string) => {
    try {
      await operations.importSelfHostedWallet(privateKeyOrMnemonic, label);
    } catch (error) {
      console.error('Failed to import self-hosted wallet:', error);
      throw error;
    }
  }, [operations]);

  const switchWallet = useCallback((walletId: string) => {
    operations.setActiveWallet(walletId);
  }, [operations]);

  const disconnectWallet = useCallback((walletId: string) => {
    const wallet = operations.getWalletById(walletId);
    if (wallet?.type === 'webauthn') {
      webauthnAdapter.disconnect();
    } else {
      operations.disconnectWallet(walletId);
    }
  }, [operations, webauthnAdapter]);

  const removeWallet = useCallback((walletId: string) => {
    const wallet = operations.getWalletById(walletId);
    if (wallet?.type === 'webauthn') {
      webauthnAdapter.clearWallet();
    } else {
      operations.removeWallet(walletId);
    }
  }, [operations, webauthnAdapter]);

  // Transaction Operations
  const sendTransaction = useCallback(async (to: string, value: string, walletId?: string) => {
    const activeWallet = operations.getActiveWallet();
    const targetWallet = walletId ? operations.getWalletById(walletId) : activeWallet;

    if (!targetWallet) {
      throw new Error('No wallet selected for transaction');
    }

    if (targetWallet.type === 'webauthn') {
      return await webauthnAdapter.sendTransaction(to, value);
    } else {
      return await operations.sendTransaction(to, value, targetWallet.id);
    }
  }, [operations, webauthnAdapter]);

  const signMessage = useCallback(async (message: string, walletId?: string) => {
    const activeWallet = operations.getActiveWallet();
    const targetWallet = walletId ? operations.getWalletById(walletId) : activeWallet;

    if (!targetWallet) {
      throw new Error('No wallet selected for signing');
    }

    if (targetWallet.type === 'webauthn') {
      return await webauthnAdapter.signMessage(message);
    } else {
      return await operations.signMessage(message, targetWallet.id);
    }
  }, [operations, webauthnAdapter]);

  // Balance Operations
  const updateBalance = useCallback(async (walletId?: string) => {
    try {
      await operations.updateBalance(walletId);
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  }, [operations]);

  const updateAllBalances = useCallback(async () => {
    try {
      await operations.updateAllBalances();
    } catch (error) {
      console.error('Failed to update all balances:', error);
    }
  }, [operations]);

  // Computed Properties
  const activeWallet = operations.getActiveWallet();
  const connectedWallets = Object.values(wallets).filter(w => w.isConnected);
  const webauthnWallets = operations.getWalletsByType('webauthn');
  const selfHostedWallets = operations.getWalletsByType('self-hosted');
  const externalWallets = operations.getWalletsByType('external');

  // Connection state helpers
  const isConnected = operations.isAnyWalletConnected();
  const isWebAuthnConnected = webauthnWallets.some(w => w.isConnected);
  const isSelfHostedConnected = selfHostedWallets.some(w => w.isConnected);
  const isWebAuthnAuthenticated = webauthnWallets.some(w => (w as any).isAuthenticated);
  const isWebAuthnRegistered = webauthnAdapter.isWalletRegistered();

  // Wallet type availability
  const isWebAuthnSupported = connection.isWebAuthnSupported;
  const canCreateWebAuthn = isWebAuthnSupported && !isWebAuthnRegistered;
  const canAuthenticateWebAuthn = isWebAuthnSupported && isWebAuthnRegistered && !isWebAuthnAuthenticated;

  return {
    // Initialization
    isInitialized,

    // State
    wallets: Object.values(wallets),
    activeWallet,
    connectedWallets,
    connection,

    // Wallet Collections
    webauthnWallets,
    selfHostedWallets,
    externalWallets,

    // Connection Status
    isConnected,
    isWebAuthnConnected,
    isSelfHostedConnected,
    isWebAuthnAuthenticated,
    isWebAuthnRegistered,

    // Capabilities
    isWebAuthnSupported,
    canCreateWebAuthn,
    canAuthenticateWebAuthn,

    // Wallet Management Operations
    createWebAuthnWallet,
    authenticateWebAuthn,
    createSelfHostedWallet,
    importSelfHostedWallet,
    switchWallet,
    disconnectWallet,
    removeWallet,

    // Transaction Operations
    sendTransaction,
    signMessage,

    // Balance Operations
    updateBalance,
    updateAllBalances,

    // Utility Operations
    getWalletById: operations.getWalletById,
    getWalletsByType: operations.getWalletsByType,
  };
};