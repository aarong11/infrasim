import { APIThrottler } from '../utils/api-throttler';

// DAO Data Types
export interface DAORole {
  name: string;
  description: string;
  permissions: string[];
  walletAddress?: string;
}

export interface ShareAllocation {
  address: string;
  percentage: number;
  role: string;
}

export interface DAOData {
  id?: number;
  name: string;
  symbol: string;
  jurisdiction: string;
  mission: string;
  constitution?: string;
  roles: string[] | DAORole[];
  members?: string[];
  creator?: string;
  shareAllocations?: ShareAllocation[];
  companyId?: string;
  transactionHash?: string;
  contractAddress?: string;
  createdAt?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface DeploymentInfo {
  networkName: string;
  rpcEndpoint: string;
  daoFactoryAddress: string;
  chainId?: number;
  isConnected?: boolean;
}

export interface CreateDAORequest {
  action: 'create';
  name: string;
  symbol: string;
  jurisdiction: string;
  mission: string;
  constitution?: string;
  roles: string[];
  roleHolders: string[];
  createCompany?: boolean;
  companyData?: {
    name: string;
    description: string;
    sectorTags: string[];
    services: string[];
    metadata: any;
  };
  companyId?: string;
}

export interface CreateDAOResponse {
  success: boolean;
  message?: string;
  error?: string;
  daoId?: number;
  companyId?: string;
  transactionHash?: string;
  contractAddress?: string;
  dao?: DAOData;
}

export interface ListDAOsResponse {
  success: boolean;
  error?: string;
  daos: DAOData[];
  total?: number;
}

export interface GetDAOResponse {
  success: boolean;
  error?: string;
  dao?: DAOData;
}

export interface ContractAddressResponse {
  success: boolean;
  error?: string;
  address?: string;
  abi?: any[];
  deploymentInfo?: DeploymentInfo;
}

/**
 * Client-side DAO service for frontend interactions
 * Handles all DAO-related API calls with proper error handling and throttling
 */
export class ClientDAOService {
  private apiUrl = '/api/dao';
  private contractsApiUrl = '/api/contracts';
  private throttler = new APIThrottler({
    minInterval: 1000,
    maxBackoff: 30000,
    maxRetries: 3,
    baseBackoff: 2000
  });

  // Cache for pending requests to avoid duplicate calls
  private pendingRequests = new Map<string, Promise<any>>();

  private async makeRequest(url: string, options: RequestInit = {}) {
    const requestKey = `${url}_${JSON.stringify(options)}`;
    
    // Return existing promise if the same request is already pending
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    const promise = this.throttler.throttledCall(
      () => fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      }),
      requestKey
    ).then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return response.json();
    }).finally(() => {
      // Remove from pending requests when done
      this.pendingRequests.delete(requestKey);
    });

    this.pendingRequests.set(requestKey, promise);
    return promise;
  }

  /**
   * Create a new DAO
   */
  async createDAO(params: Omit<CreateDAORequest, 'action'>): Promise<CreateDAOResponse> {
    try {
      return await this.makeRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          ...params
        })
      });
    } catch (error) {
      console.error('Failed to create DAO:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create DAO'
      };
    }
  }

  /**
   * Get all DAOs from the network
   */
  async getAllDAOs(): Promise<ListDAOsResponse> {
    try {
      return await this.makeRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'list'
        })
      });
    } catch (error) {
      console.error('Failed to fetch DAOs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch DAOs',
        daos: []
      };
    }
  }

  /**
   * Get a specific DAO by ID
   */
  async getDAO(daoId: number): Promise<GetDAOResponse> {
    try {
      const response = await this.makeRequest(`${this.apiUrl}?daoId=${daoId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch DAO:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch DAO'
      };
    }
  }

  /**
   * Get DAO by contract address or list all DAOs
   */
  async getDAOByAddress(contractAddress?: string, daoId?: number): Promise<ListDAOsResponse> {
    try {
      return await this.makeRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'get',
          contractAddress,
          daoId
        })
      });
    } catch (error) {
      console.error('Failed to fetch DAO by address:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch DAO',
        daos: []
      };
    }
  }

  /**
   * Get deployed contract addresses and deployment info
   */
  async getDeploymentInfo(): Promise<ContractAddressResponse> {
    try {
      const response = await this.makeRequest(`${this.contractsApiUrl}?name=DAOFactory`);
      
      if (response.success && response.contract) {
        return {
          success: true,
          address: response.contract.address,
          abi: response.contract.metadata?.abi,
          deploymentInfo: {
            networkName: response.network?.name || 'localhost',
            rpcEndpoint: response.network?.rpcUrl || 'http://localhost:8545',
            daoFactoryAddress: response.contract.address,
            chainId: response.network?.chainId || 31337,
            isConnected: true
          }
        };
      }
      
      return {
        success: false,
        error: 'DAOFactory contract not found'
      };
    } catch (error) {
      console.error('Failed to fetch deployment info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deployment info'
      };
    }
  }

  /**
   * Get contract registry information
   */
  async getContractInfo(contractName: string = 'DAOFactory'): Promise<ContractAddressResponse> {
    try {
      const response = await this.makeRequest(`${this.contractsApiUrl}?name=${contractName}`);
      
      if (response.success) {
        return {
          success: true,
          address: response.contract?.address,
          abi: response.contract?.metadata?.abi,
          deploymentInfo: response.network ? {
            networkName: response.network.name,
            rpcEndpoint: response.network.rpcUrl,
            daoFactoryAddress: response.contract?.address,
            chainId: response.network.chainId,
            isConnected: true
          } : undefined
        };
      }
      
      return response;
    } catch (error) {
      console.error('Failed to fetch contract info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contract info'
      };
    }
  }

  /**
   * Check if the DAO Factory contract is deployed and accessible
   */
  async checkDeployment(): Promise<{ isDeployed: boolean; error?: string; info?: DeploymentInfo }> {
    try {
      const deploymentInfo = await this.getDeploymentInfo();
      
      if (deploymentInfo.success && deploymentInfo.deploymentInfo) {
        return {
          isDeployed: true,
          info: deploymentInfo.deploymentInfo
        };
      }
      
      return {
        isDeployed: false,
        error: deploymentInfo.error || 'Deployment check failed'
      };
    } catch (error) {
      return {
        isDeployed: false,
        error: error instanceof Error ? error.message : 'Failed to check deployment'
      };
    }
  }

  /**
   * Validate DAO creation parameters
   */
  validateDAOParams(params: Partial<CreateDAORequest>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.name?.trim()) {
      errors.push('DAO name is required');
    }

    if (!params.symbol?.trim()) {
      errors.push('DAO symbol is required');
    } else if (params.symbol.length > 10) {
      errors.push('DAO symbol must be 10 characters or less');
    }

    if (!params.jurisdiction?.trim()) {
      errors.push('Jurisdiction is required');
    }

    if (!params.mission?.trim()) {
      errors.push('Mission statement is required');
    }

    if (!params.roles || params.roles.length === 0) {
      errors.push('At least one role is required');
    }

    if (!params.roleHolders || params.roleHolders.length === 0) {
      errors.push('At least one role holder address is required');
    }

    if (params.roles && params.roleHolders && params.roles.length !== params.roleHolders.length) {
      errors.push('Number of roles must match number of role holders');
    }

    // Validate Ethereum addresses
    if (params.roleHolders) {
      params.roleHolders.forEach((address, index) => {
        if (address && !isValidEthereumAddress(address)) {
          errors.push(`Invalid Ethereum address for role ${index + 1}: ${address}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset any cached requests (useful for manual refresh)
   */
  resetCache(): void {
    this.pendingRequests.clear();
    this.throttler.reset?.();
  }
}

/**
 * Simple Ethereum address validation
 */
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Singleton instance for use across the application
 */
let daoServiceInstance: ClientDAOService | null = null;

/**
 * Get the singleton DAO service instance
 */
export async function getDAOService(): Promise<ClientDAOService> {
  if (!daoServiceInstance) {
    daoServiceInstance = new ClientDAOService();
  }
  return daoServiceInstance;
}

/**
 * Reset the DAO service instance (useful for testing or reinitialization)
 */
export function resetDAOService(): void {
  if (daoServiceInstance) {
    daoServiceInstance.resetCache();
  }
  daoServiceInstance = null;
}

// Export types for use in other components (already exported above)
// export type { ShareAllocation, CreateDAORequest, CreateDAOResponse, ListDAOsResponse, GetDAOResponse };