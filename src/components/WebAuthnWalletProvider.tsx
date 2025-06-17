'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { SecureWebAuthnWallet } from './SecureWebAuthnWallet';

interface WalletData {
  address: string;
  privateKey: string;
  mnemonic: string;
  balance: string; // ETH balance
  usdcBalance?: string; // USDC balance
  // New multi-address support
  addresses?: WalletAddress[];
  customTokens?: CustomToken[];
}

interface WalletAddress {
  id: string;
  address: string;
  privateKey: string;
  label: string;
  balance: string;
  isDefault: boolean;
  derivationPath?: string;
}

interface CustomToken {
  id: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  enabled: boolean;
}

interface WebAuthnWalletContextType {
  wallet: WalletData | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  isRegistered: boolean;
  provider: ethers.JsonRpcProvider | null;
  isWebAuthnSupported: boolean;
  registerWallet: () => Promise<void>;
  authenticate: () => Promise<void>;
  disconnect: () => void;
  clearWallet: () => void;
  updateBalance: () => Promise<void>;
  sendTransaction: (to: string, value: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  timeRemaining: number;
  // New multi-address and token management methods
  createNewAddress: (label: string) => Promise<WalletAddress>;
  switchToAddress: (addressId: string) => Promise<void>;
  addCustomToken: (tokenData: Omit<CustomToken, 'id' | 'balance'>) => Promise<void>;
  removeCustomToken: (tokenId: string) => Promise<void>;
  updateTokenBalances: () => Promise<void>;
  getTokenBalance: (tokenAddress: string, walletAddress: string) => Promise<string>;
}

const WebAuthnWalletContext = createContext<WebAuthnWalletContextType | undefined>(undefined);

export const useWebAuthnWallet = () => {
  const context = useContext(WebAuthnWalletContext);
  if (context === undefined) {
    throw new Error('useWebAuthnWallet must be used within a WebAuthnWalletProvider');
  }
  return context;
};

interface WebAuthnWalletProviderProps {
  children: ReactNode;
}

export const WebAuthnWalletProvider: React.FC<WebAuthnWalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [secureWallet] = useState(() => SecureWebAuthnWallet.getInstance());

  // Define updateBalance function first, before it's used in useEffect
  const updateBalance = async () => {
    const currentWallet = wallet;
    if (!currentWallet || !provider) {
      console.log('Cannot update balance: wallet or provider not available');
      return;
    }

    try {
      console.log('Updating balance for wallet:', currentWallet.address);
      
      // Get ETH balance directly from provider
      const ethBalance = await provider.getBalance(currentWallet.address);
      const formattedEthBalance = ethers.formatEther(ethBalance);
      console.log('ETH balance:', formattedEthBalance);
      
      let usdcBalance: string | undefined;
      
      // Try to get USDC balance if contract is deployed
      try {
        console.log('Fetching USDC balance from faucet API...');
        const response = await fetch('/api/faucet?address=' + currentWallet.address);
        const data = await response.json();
        console.log('Faucet API response:', data);
        
        if (data.success && data.usdcBalance !== undefined) {
          usdcBalance = data.usdcBalance;
          console.log('USDC balance:', usdcBalance);
        }
      } catch (error) {
        console.warn('Could not fetch USDC balance:', error);
        // USDC contract might not be deployed, which is fine
      }
      
      setWallet(prev => prev ? { 
        ...prev, 
        balance: formattedEthBalance,
        usdcBalance 
      } : null);
      
      console.log('Balance updated successfully');
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  };

  useEffect(() => {
    // Initialize provider for local hardhat network
    const initProvider = () => {
      try {
        const rpcProvider = new ethers.JsonRpcProvider('http://localhost:8545');
        setProvider(rpcProvider);
        console.log('Provider initialized');
      } catch (error) {
        console.error('Failed to connect to local RPC:', error);
      }
    };

    // Check WebAuthn support
    const checkWebAuthnSupport = () => {
      const supported = !!(window.PublicKeyCredential && navigator.credentials);
      setIsWebAuthnSupported(supported);
    };

    // Check if wallet is already registered
    const checkRegistration = () => {
      setIsRegistered(secureWallet.isWalletRegistered());
    };

    // Check if wallet is currently unlocked in memory
    const checkCurrentWallet = () => {
      const currentWallet = secureWallet.getCurrentWallet();
      if (currentWallet) {
        console.log('Found existing wallet:', currentWallet.address);
        const walletData: WalletData = {
          address: currentWallet.address,
          privateKey: currentWallet.privateKey,
          mnemonic: currentWallet.mnemonic,
          balance: '0.0'
        };
        setWallet(walletData);
        setIsConnected(true);
        setIsAuthenticated(true);
        // Don't call updateBalance here - it will be called in a separate useEffect
      }
    };

    initProvider();
    checkWebAuthnSupport();
    checkRegistration();
    checkCurrentWallet();
  }, [secureWallet]);

  // Separate useEffect to update balance when wallet and provider are ready
  useEffect(() => {
    if (wallet && provider && isAuthenticated) {
      console.log('Wallet and provider ready, updating balance...');
      updateBalance();
    }
  }, [wallet?.address, provider, isAuthenticated]);

  // Timer for session timeout display
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAuthenticated) {
      interval = setInterval(() => {
        const currentWallet = secureWallet.getCurrentWallet();
        if (!currentWallet) {
          // Wallet timed out
          setWallet(null);
          setIsConnected(false);
          setIsAuthenticated(false);
          setTimeRemaining(0);
        } else {
          // Update countdown (approximate)
          setTimeRemaining(prev => Math.max(0, prev - 1));
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, secureWallet]);

  const registerWallet = async () => {
    try {
      const newWallet = await secureWallet.registerWebAuthnAndStoreWallet();
      const walletData: WalletData = {
        address: newWallet.address,
        privateKey: newWallet.privateKey,
        mnemonic: newWallet.mnemonic,
        balance: '0.0'
      };
      
      setWallet(walletData);
      setIsConnected(true);
      setIsAuthenticated(true);
      setIsRegistered(true);
      setTimeRemaining(300); // 5 minutes
      
      await updateBalance();
    } catch (error) {
      console.error('Failed to register wallet:', error);
      throw error;
    }
  };

  const authenticate = async () => {
    try {
      const authenticatedWallet = await secureWallet.authenticateAndLoadWallet();
      if (authenticatedWallet) {
        const walletData: WalletData = {
          address: authenticatedWallet.address,
          privateKey: authenticatedWallet.privateKey,
          mnemonic: authenticatedWallet.mnemonic,
          balance: '0.0'
        };
        
        setWallet(walletData);
        setIsConnected(true);
        setIsAuthenticated(true);
        setTimeRemaining(300); // 5 minutes
        
        await updateBalance();
      }
    } catch (error) {
      console.error('Failed to authenticate:', error);
      throw error;
    }
  };

  const disconnect = () => {
    secureWallet.clearDecryptedWallet();
    setWallet(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setTimeRemaining(0);
  };

  const clearWallet = () => {
    secureWallet.clearAllWalletData();
    setWallet(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setIsRegistered(false);
    setTimeRemaining(0);
  };

  const sendTransaction = async (to: string, value: string): Promise<string> => {
    if (!wallet || !provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const ethersWallet = new ethers.Wallet(wallet.privateKey, provider);
      const tx = await ethersWallet.sendTransaction({
        to,
        value: ethers.parseEther(value)
      });
      
      // Update balance after transaction
      await updateBalance();
      
      return tx.hash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const ethersWallet = new ethers.Wallet(wallet.privateKey);
      return await ethersWallet.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };

  // New multi-address and token management methods
  const createNewAddress = async (label: string): Promise<WalletAddress> => {
    if (!wallet || !provider) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create a new random wallet (in production, you might want to use HD derivation)
      const newWallet = ethers.Wallet.createRandom();
      
      const newAddress: WalletAddress = {
        id: crypto.randomUUID(),
        address: newWallet.address,
        privateKey: newWallet.privateKey,
        label,
        balance: '0.0',
        isDefault: false
      };

      // Update wallet data with new address
      setWallet(prev => prev ? {
        ...prev,
        addresses: [...(prev.addresses || []), newAddress]
      } : null);

      return newAddress;
    } catch (error) {
      console.error('Failed to create new address:', error);
      throw error;
    }
  };

  const switchToAddress = async (addressId: string): Promise<void> => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    const targetAddress = wallet.addresses?.find(addr => addr.id === addressId);
    if (!targetAddress) {
      throw new Error('Address not found');
    }

    // Switch to the selected address as the primary address
    setWallet(prev => prev ? {
      ...prev,
      address: targetAddress.address,
      privateKey: targetAddress.privateKey,
      balance: targetAddress.balance,
      addresses: prev.addresses?.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }))
    } : null);

    // Update balance for the new active address
    await updateBalance();
  };

  const addCustomToken = async (tokenData: Omit<CustomToken, 'id' | 'balance'>): Promise<void> => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    const newToken: CustomToken = {
      ...tokenData,
      id: crypto.randomUUID(),
      balance: '0.0'
    };

    // Validate token contract exists
    try {
      await getTokenBalance(tokenData.address, wallet.address);
    } catch (error) {
      throw new Error('Invalid token contract or network error');
    }

    setWallet(prev => prev ? {
      ...prev,
      customTokens: [...(prev.customTokens || []), newToken]
    } : null);

    // Update token balance
    await updateTokenBalances();
  };

  const removeCustomToken = async (tokenId: string): Promise<void> => {
    setWallet(prev => prev ? {
      ...prev,
      customTokens: prev.customTokens?.filter(token => token.id !== tokenId)
    } : null);
  };

  const getTokenBalance = async (tokenAddress: string, walletAddress: string): Promise<string> => {
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const tokenAbi = [
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals()
      ]);

      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return '0.0';
    }
  };

  const updateTokenBalances = async (): Promise<void> => {
    if (!wallet || !provider) return;

    try {
      const updatedTokens = await Promise.all(
        (wallet.customTokens || []).map(async (token) => {
          const balance = await getTokenBalance(token.address, wallet.address);
          return { ...token, balance };
        })
      );

      setWallet(prev => prev ? {
        ...prev,
        customTokens: updatedTokens
      } : null);
    } catch (error) {
      console.error('Failed to update token balances:', error);
    }
  };

  const value = {
    wallet,
    isConnected,
    isAuthenticated,
    isRegistered,
    provider,
    isWebAuthnSupported,
    registerWallet,
    authenticate,
    disconnect,
    clearWallet,
    updateBalance,
    sendTransaction,
    signMessage,
    timeRemaining,
    // New methods
    createNewAddress,
    switchToAddress,
    addCustomToken,
    removeCustomToken,
    updateTokenBalances,
    getTokenBalance
  };

  return (
    <WebAuthnWalletContext.Provider value={value}>
      {children}
    </WebAuthnWalletContext.Provider>
  );
};