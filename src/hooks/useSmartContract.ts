'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWebAuthnWallet, useSelfHostedWallet } from '../providers/UnifiedWalletProvider';
import { 
  DAOService, 
  SmartContractService, 
  WalletAdapterFactory,
  ContractResult,
  CreateDAOParams 
} from '@shared/index';

export const useSmartContract = () => {
  const webAuthnWallet = useWebAuthnWallet();
  const selfHostedWallet = useSelfHostedWallet();
  
  const [contractService, setContractService] = useState<SmartContractService | null>(null);
  const [daoService, setDaoService] = useState<DAOService | null>(null);

  // Determine which wallet is active
  const activeWallet = useMemo(() => {
    if (webAuthnWallet.isAuthenticated && webAuthnWallet.wallet) {
      return {
        type: 'webauthn' as const,
        wallet: webAuthnWallet.wallet,
        provider: webAuthnWallet.provider
      };
    }
    if (selfHostedWallet.isConnected && selfHostedWallet.wallet) {
      return {
        type: 'self-hosted' as const,
        wallet: selfHostedWallet.wallet,
        provider: selfHostedWallet.provider
      };
    }
    return null;
  }, [
    webAuthnWallet.isAuthenticated, 
    webAuthnWallet.wallet, 
    webAuthnWallet.provider,
    selfHostedWallet.isConnected, 
    selfHostedWallet.wallet, 
    selfHostedWallet.provider
  ]);

  // Initialize services when wallet changes
  useEffect(() => {
    if (activeWallet && activeWallet.provider) {
      try {
        const walletAdapter = WalletAdapterFactory.createAdapter(
          activeWallet.type, 
          activeWallet.wallet
        );
        
        const smartContractService = new SmartContractService(walletAdapter.provider);
        const daoSvc = new DAOService(walletAdapter.provider);
        
        setContractService(smartContractService);
        setDaoService(daoSvc);
      } catch (error) {
        console.error('Failed to initialize smart contract services:', error);
        setContractService(null);
        setDaoService(null);
      }
    } else {
      setContractService(null);
      setDaoService(null);
    }
  }, [activeWallet]);

  // DAO-specific methods
  const createDAO = async (params: CreateDAOParams): Promise<ContractResult<string>> => {
    if (!daoService) {
      return { success: false, error: 'No wallet connected' };
    }
    return await daoService.createDAO(params);
  };

  const getAllDAOs = async () => {
    if (!daoService) {
      return { success: false, error: 'No wallet connected' };
    }
    return await daoService.getAllDAOs();
  };

  const getTotalDAOs = async () => {
    if (!daoService) {
      return { success: false, error: 'No wallet connected' };
    }
    return await daoService.getTotalDAOs();
  };

  const estimateCreateDAOGas = async (params: CreateDAOParams) => {
    if (!daoService) {
      return { success: false, error: 'No wallet connected' };
    }
    return await daoService.estimateCreateDAOGas(params);
  };

  // General smart contract methods
  const callContract = async (
    contractName: string,
    method: string,
    params: any[] = []
  ) => {
    if (!contractService) {
      return { success: false, error: 'No wallet connected' };
    }
    return await contractService.callDeployedContract(contractName, method, params);
  };

  const sendToContract = async (
    contractName: string,
    method: string,
    params: any[] = [],
    options: any = {}
  ) => {
    if (!contractService) {
      return { success: false, error: 'No wallet connected' };
    }
    return await contractService.sendToDeployedContract(contractName, method, params, options);
  };

  const getContractInfo = (contractName: string) => {
    if (!contractService) return null;
    return contractService.getContractInfo(contractName);
  };

  const getAllContracts = () => {
    if (!contractService) return {};
    return contractService.getAllContracts();
  };

  const refreshDeploymentData = () => {
    if (contractService) {
      contractService.refreshDeploymentData();
    }
  };

  return {
    // Wallet info
    isConnected: !!activeWallet,
    activeWalletType: activeWallet?.type || null,
    walletAddress: activeWallet?.wallet?.address || null,
    
    // Services
    contractService,
    daoService,
    
    // DAO methods
    createDAO,
    getAllDAOs,
    getTotalDAOs,
    estimateCreateDAOGas,
    
    // General contract methods
    callContract,
    sendToContract,
    getContractInfo,
    getAllContracts,
    refreshDeploymentData
  };
};