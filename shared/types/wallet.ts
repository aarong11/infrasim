// Smart Contract Interaction Types
export interface IWalletProvider {
  getAddress(): string;
  signMessage(message: string): Promise<string>;
  signTransaction(transaction: any): Promise<string>;
  sendTransaction(transaction: any): Promise<string>;
  getProvider(): any; // ethers.Provider or similar
  getSigner(): any; // ethers.Signer or similar
}

export interface ISmartContractProvider {
  getContract(address: string, abi: any): any;
  call(contractAddress: string, abi: any, method: string, params?: any[]): Promise<any>;
  send(contractAddress: string, abi: any, method: string, params?: any[], options?: any): Promise<string>;
  estimateGas(contractAddress: string, abi: any, method: string, params?: any[]): Promise<string>;
}

export interface DeploymentData {
  network: string;
  chainId: number;
  deployedAt: string;
  contracts: Record<string, ContractInfo>;
}

export interface ContractInfo {
  address: string;
  deployer: string;
  deployedAt: string;
  description: string;
  abi?: any[];
}

// Transaction Options
export interface TransactionOptions {
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
  from?: string;
}

// Contract Method Result
export interface ContractResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  txHash?: string;
}

// Supported Wallet Types
export type WalletType = 'webauthn' | 'self-hosted' | 'external';

export interface WalletAdapter {
  type: WalletType;
  provider: IWalletProvider;
}