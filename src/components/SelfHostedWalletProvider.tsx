'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

interface WalletData {
  address: string;
  privateKey: string;
  mnemonic: string;
  balance: string;
}

interface SelfHostedWalletContextType {
  wallet: WalletData | null;
  isConnected: boolean;
  provider: ethers.JsonRpcProvider | null;
  connect: (privateKeyOrMnemonic: string) => Promise<void>;
  disconnect: () => void;
  generateNewWallet: () => void;
  updateBalance: () => Promise<void>;
  sendTransaction: (to: string, value: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

const SelfHostedWalletContext = createContext<SelfHostedWalletContextType | undefined>(undefined);

export const useSelfHostedWallet = () => {
  const context = useContext(SelfHostedWalletContext);
  if (context === undefined) {
    throw new Error('useSelfHostedWallet must be used within a SelfHostedWalletProvider');
  }
  return context;
};

interface SelfHostedWalletProviderProps {
  children: ReactNode;
}

export const SelfHostedWalletProvider: React.FC<SelfHostedWalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);

  useEffect(() => {
    // Initialize provider for local hardhat network
    const initProvider = () => {
      try {
        const rpcProvider = new ethers.JsonRpcProvider('http://localhost:8545');
        setProvider(rpcProvider);
      } catch (error) {
        console.error('Failed to connect to local RPC:', error);
      }
    };

    initProvider();

    // Load wallet from localStorage if exists
    const savedWallet = localStorage.getItem('selfHostedWallet');
    if (savedWallet) {
      try {
        const walletData = JSON.parse(savedWallet);
        setWallet(walletData);
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to load saved wallet:', error);
      }
    }
  }, []);

  const generateNewWallet = () => {
    try {
      const randomWallet = ethers.Wallet.createRandom();
      const walletData: WalletData = {
        address: randomWallet.address,
        privateKey: randomWallet.privateKey,
        mnemonic: randomWallet.mnemonic?.phrase || '',
        balance: '0.0'
      };
      
      setWallet(walletData);
      setIsConnected(true);
      
      // Save to localStorage
      localStorage.setItem('selfHostedWallet', JSON.stringify(walletData));
      
      // Update balance
      updateBalance();
    } catch (error) {
      console.error('Failed to generate wallet:', error);
      throw error;
    }
  };

  const connect = async (privateKeyOrMnemonic: string) => {
    try {
      let importedWallet: ethers.Wallet | ethers.HDNodeWallet;
      let walletData: WalletData;
      
      if (privateKeyOrMnemonic.includes(' ')) {
        // It's a mnemonic
        const hdWallet = ethers.Wallet.fromPhrase(privateKeyOrMnemonic);
        walletData = {
          address: hdWallet.address,
          privateKey: hdWallet.privateKey,
          mnemonic: hdWallet.mnemonic?.phrase || '',
          balance: '0.0'
        };
      } else {
        // It's a private key
        importedWallet = new ethers.Wallet(privateKeyOrMnemonic);
        walletData = {
          address: importedWallet.address,
          privateKey: importedWallet.privateKey,
          mnemonic: '',
          balance: '0.0'
        };
      }
      
      setWallet(walletData);
      setIsConnected(true);
      
      // Save to localStorage
      localStorage.setItem('selfHostedWallet', JSON.stringify(walletData));
      
      // Update balance
      await updateBalance();
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw error;
    }
  };

  const updateBalance = async () => {
    if (!wallet || !provider) return;

    try {
      const balance = await provider.getBalance(wallet.address);
      const formattedBalance = ethers.formatEther(balance);
      
      const updatedWallet = { ...wallet, balance: formattedBalance };
      setWallet(updatedWallet);
      
      // Update localStorage
      localStorage.setItem('selfHostedWallet', JSON.stringify(updatedWallet));
    } catch (error) {
      console.error('Failed to update balance:', error);
      throw error;
    }
  };

  const disconnect = () => {
    setWallet(null);
    setIsConnected(false);
    localStorage.removeItem('selfHostedWallet');
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

  const value = {
    wallet,
    isConnected,
    provider,
    connect,
    disconnect,
    generateNewWallet,
    updateBalance,
    sendTransaction,
    signMessage
  };

  return (
    <SelfHostedWalletContext.Provider value={value}>
      {children}
    </SelfHostedWalletContext.Provider>
  );
};