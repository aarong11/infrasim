import { ethers } from 'ethers';
// Remove Node.js imports that don't work in browser
// import fs from 'fs';
// import path from 'path';
import { 
  IWalletProvider, 
  ISmartContractProvider, 
  DeploymentData, 
  ContractInfo,
  TransactionOptions,
  ContractResult
} from '../types/wallet';

export class SmartContractService implements ISmartContractProvider {
  private walletProvider: IWalletProvider;
  private deploymentData: DeploymentData | null = null;
  private contractCache: Map<string, ethers.Contract> = new Map();

  constructor(walletProvider: IWalletProvider, deploymentData?: DeploymentData) {
    this.walletProvider = walletProvider;
    // Accept deployment data as parameter instead of reading from fs
    if (deploymentData) {
      this.deploymentData = deploymentData;
    } else {
      this.loadDeploymentData();
    }
  }

  private loadDeploymentData(): void {
    try {
      // Only try to load from file system in Node.js environment
      if (typeof window === 'undefined' && typeof process !== 'undefined' && process.cwd) {
        // Server-side: try to load from file system using new standard path
        const fs = require('fs');
        const path = require('path');
        const deployedPath = path.join(process.cwd(), 'ethereum/deployed.json');
        
        if (fs.existsSync(deployedPath)) {
          const data = fs.readFileSync(deployedPath, 'utf8');
          this.deploymentData = JSON.parse(data);
        }
      } else {
        // Browser-side: deployment data should be provided via constructor or API
        console.log('Running in browser - deployment data should be provided via constructor or loaded from API');
      }
    } catch (error) {
      console.warn('Failed to load deployment data:', error);
    }
  }

  public setDeploymentData(deploymentData: DeploymentData): void {
    this.deploymentData = deploymentData;
    this.contractCache.clear();
  }

  public setWalletProvider(walletProvider: IWalletProvider): void {
    this.walletProvider = walletProvider;
    // Clear contract cache when wallet changes
    this.contractCache.clear();
  }

  public getContract(address: string, abi: any, needsSigner: boolean = false): ethers.Contract {
    const cacheKey = `${address}-${JSON.stringify(abi)}-${needsSigner}`;
    
    if (this.contractCache.has(cacheKey)) {
      return this.contractCache.get(cacheKey)!;
    }

    const providerOrSigner = needsSigner ? this.walletProvider.getSigner() : this.walletProvider.getProvider();
    const contract = new ethers.Contract(address, abi, providerOrSigner);
    this.contractCache.set(cacheKey, contract);
    
    return contract;
  }

  public async call(
    contractAddress: string, 
    abi: any, 
    method: string, 
    params: any[] = []
  ): Promise<any> {
    try {
      const contract = this.getContract(contractAddress, abi, false); // Read-only, no signer needed
      const result = await contract[method](...params);
      return result;
    } catch (error) {
      throw new Error(`Contract call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async send(
    contractAddress: string, 
    abi: any, 
    method: string, 
    params: any[] = [],
    options: TransactionOptions = {}
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, abi, true); // Needs signer for transactions
      
      const txOptions: any = {};
      if (options.value) txOptions.value = ethers.parseEther(options.value);
      if (options.gasLimit) txOptions.gasLimit = options.gasLimit;
      if (options.gasPrice) txOptions.gasPrice = options.gasPrice;

      const tx = await contract[method](...params, txOptions);
      return tx.hash;
    } catch (error) {
      throw new Error(`Contract transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async estimateGas(
    contractAddress: string, 
    abi: any, 
    method: string, 
    params: any[] = []
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, abi, true); // Needs signer for gas estimation
      const estimate = await contract[method].estimateGas(...params);
      return estimate.toString();
    } catch (error) {
      throw new Error(`Gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Convenience methods for deployed contracts
  public getContractInfo(contractName: string): ContractInfo | null {
    if (!this.deploymentData?.contracts[contractName]) {
      return null;
    }
    return this.deploymentData.contracts[contractName];
  }

  public getContractAddress(contractName: string): string | null {
    const info = this.getContractInfo(contractName);
    return info?.address || null;
  }

  public async callDeployedContract<T = any>(
    contractName: string,
    method: string,
    params: any[] = [],
    abi?: any[]
  ): Promise<ContractResult<T>> {
    try {
      const contractInfo = this.getContractInfo(contractName);
      if (!contractInfo) {
        return { success: false, error: `Contract '${contractName}' not found in deployment data` };
      }

      const contractAbi = abi || contractInfo.abi || this.getDefaultAbi(contractName);
      if (!contractAbi) {
        return { success: false, error: `ABI not found for contract '${contractName}'` };
      }

      const result = await this.call(contractInfo.address, contractAbi, method, params);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  public async sendToDeployedContract(
    contractName: string,
    method: string,
    params: any[] = [],
    options: TransactionOptions = {},
    abi?: any[]
  ): Promise<ContractResult<string>> {
    try {
      const contractInfo = this.getContractInfo(contractName);
      if (!contractInfo) {
        return { success: false, error: `Contract '${contractName}' not found in deployment data` };
      }

      const contractAbi = abi || contractInfo.abi || this.getDefaultAbi(contractName);
      if (!contractAbi) {
        return { success: false, error: `ABI not found for contract '${contractName}'` };
      }

      const txHash = await this.send(contractInfo.address, contractAbi, method, params, options);
      return { success: true, data: txHash, txHash };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private getDefaultAbi(contractName: string): any[] | null {
    // Default ABIs for known contracts
    const defaultAbis: Record<string, any[]> = {
      DAOFactory: [
        'function createDAO(string memory name, string memory description, uint256 votingPeriod, uint256 proposalThreshold) external returns (address)',
        'function totalDAOs() external view returns (uint256)',
        'function daos(uint256 index) external view returns (address)',
        'function daoCreators(address dao) external view returns (address)',
        'function isDAO(address dao) external view returns (bool)'
      ],
      USDC: [
        'function name() external view returns (string)',
        'function symbol() external view returns (string)',
        'function decimals() external view returns (uint8)',
        'function totalSupply() external view returns (uint256)',
        'function balanceOf(address account) external view returns (uint256)',
        'function transfer(address to, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) external view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function transferFrom(address from, address to, uint256 amount) external returns (bool)'
      ],
      BridgeVault: [
        'function deposit() external payable',
        'function withdraw(uint256 amount) external',
        'function balance() external view returns (uint256)',
        'function owner() external view returns (address)'
      ],
      APIAccessRegistry: [
        'function register() external payable',
        'function isRegistered(address user) external view returns (bool)',
        'function deposit() external view returns (uint256)',
        'function getServiceTier(address user) external view returns (string)'
      ],
      ContractRegistry: [
        'function registerService(string memory name, address contractAddress, string memory metadata) external',
        'function getService(string memory name) external view returns (address, string memory, uint256, bool)',
        'function getAllServices() external view returns (string[] memory)',
        'function updateService(string memory name, address newAddress, string memory newMetadata) external'
      ]
    };

    return defaultAbis[contractName] || null;
  }

  // Utility methods
  public getAllContracts(): Record<string, ContractInfo> {
    return this.deploymentData?.contracts || {};
  }

  public getDeploymentInfo(): DeploymentData | null {
    return this.deploymentData;
  }

  public refreshDeploymentData(): void {
    this.loadDeploymentData();
    this.contractCache.clear();
  }
}