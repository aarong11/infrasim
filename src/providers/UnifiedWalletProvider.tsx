'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useWalletManager } from '../hooks/useWalletManager';

// Create a context for the unified wallet system
const UnifiedWalletContext = createContext<ReturnType<typeof useWalletManager> | undefined>(undefined);

interface UnifiedWalletProviderProps {
  children: ReactNode;
}

/**
 * Unified Wallet Provider
 * Replaces the multiple separate wallet providers with a single unified system
 */
export const UnifiedWalletProvider: React.FC<UnifiedWalletProviderProps> = ({ children }) => {
  const walletManager = useWalletManager();

  return (
    <UnifiedWalletContext.Provider value={walletManager}>
      {children}
    </UnifiedWalletContext.Provider>
  );
};

/**
 * Hook to access the unified wallet system
 */
export const useUnifiedWallet = () => {
  const context = useContext(UnifiedWalletContext);
  if (context === undefined) {
    throw new Error('useUnifiedWallet must be used within a UnifiedWalletProvider');
  }
  return context;
};

/**
 * Backward compatibility hooks for existing components
 */

// WebAuthn compatibility hook
export const useWebAuthnWallet = () => {
  const {
    webauthnWallets,
    activeWallet,
    isWebAuthnConnected,
    isWebAuthnAuthenticated,
    isWebAuthnRegistered,
    isWebAuthnSupported,
    createWebAuthnWallet,
    authenticateWebAuthn,
    disconnectWallet,
    removeWallet,
    sendTransaction,
    signMessage,
    updateBalance,
    connection,
  } = useUnifiedWallet();

  const webauthnWallet = webauthnWallets[0]; // Get first WebAuthn wallet
  const isActive = activeWallet?.type === 'webauthn';

  return {
    // Wallet data (mapped to old format for compatibility)
    wallet: webauthnWallet ? {
      address: webauthnWallet.address,
      balance: webauthnWallet.balance,
      privateKey: '', // Don't expose this for security
      mnemonic: '', // Don't expose this for security
      usdcBalance: (webauthnWallet as any).usdcBalance,
      addresses: (webauthnWallet as any).addresses,
      customTokens: (webauthnWallet as any).customTokens,
    } : null,

    // Connection state
    isConnected: isWebAuthnConnected && isActive,
    isAuthenticated: isWebAuthnAuthenticated,
    isRegistered: isWebAuthnRegistered,
    isWebAuthnSupported,
    provider: connection.provider,
    timeRemaining: (webauthnWallet as any)?.timeRemaining || 0,

    // Operations
    registerWallet: createWebAuthnWallet,
    authenticate: authenticateWebAuthn,
    disconnect: () => webauthnWallet && disconnectWallet(webauthnWallet.id),
    clearWallet: () => webauthnWallet && removeWallet(webauthnWallet.id),
    sendTransaction,
    signMessage,
    updateBalance: () => updateBalance(webauthnWallet?.id),

    // Placeholder methods for compatibility
    updateTokenBalances: async () => {},
    createNewAddress: async () => ({ id: '', address: '', privateKey: '', label: '', balance: '0', isDefault: false }),
    switchToAddress: async () => {},
    addCustomToken: async () => {},
    removeCustomToken: async () => {},
    getTokenBalance: async () => '0',
    resetApiThrottling: () => {},
    jwtAuthState: { isAuthenticated: false, accessToken: null, refreshToken: null, address: null, expiresAt: null },
    authenticateWithJWT: async () => {},
    logoutJWT: async () => {},
    isJWTAuthenticated: false,
  };
};

// Self-hosted wallet compatibility hook
export const useSelfHostedWallet = () => {
  const {
    selfHostedWallets,
    activeWallet,
    isSelfHostedConnected,
    createSelfHostedWallet,
    importSelfHostedWallet,
    disconnectWallet,
    sendTransaction,
    signMessage,
    updateBalance,
    connection,
  } = useUnifiedWallet();

  const selfHostedWallet = selfHostedWallets[0]; // Get first self-hosted wallet
  const isActive = activeWallet?.type === 'self-hosted';

  return {
    // Wallet data
    wallet: selfHostedWallet ? {
      address: selfHostedWallet.address,
      balance: selfHostedWallet.balance,
      privateKey: (selfHostedWallet as any).privateKey,
      mnemonic: (selfHostedWallet as any).mnemonic,
    } : null,

    // Connection state
    isConnected: isSelfHostedConnected && isActive,
    provider: connection.provider,

    // Operations
    generateNewWallet: () => createSelfHostedWallet(),
    connect: importSelfHostedWallet,
    disconnect: () => selfHostedWallet && disconnectWallet(selfHostedWallet.id),
    sendTransaction,
    signMessage,
    updateBalance: () => updateBalance(selfHostedWallet?.id),
  };
};