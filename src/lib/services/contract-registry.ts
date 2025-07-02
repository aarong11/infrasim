import { ethers } from 'ethers';

export interface ServiceInfo {
  contractAddress: string;
  metadata: string;
  registeredAt: number;
  isActive: boolean;
}

export interface ParsedMetadata {
  description?: string;
  type?: string;
  symbol?: string;
  decimals?: number;
  ui?: string;
  serviceTiers?: string[];
  ipfs?: string;
  [key: string]: any;
}

/**
 * ContractRegistry service for resolving contract addresses via on-chain registry
 */
export class ContractRegistryService {
  private provider: ethers.JsonRpcProvider;
  private registry: ethers.Contract | null = null;
  private registryAddress: string | null = null;
  
  // ContractRegistry ABI
  private readonly registryABI = [
    'function resolve(string memory name) external view returns (address)',
    'function getMetadata(string memory name) external view returns (string memory)',
    'function getServiceInfo(string memory name) external view returns (tuple(address contractAddress, string metadata, uint256 registeredAt, bool isActive))',
    'function isServiceActive(string memory name) external view returns (bool)',
    'function getAllServices() external view returns (string[] memory)',
    'function getServicesByContract(address contractAddr) external view returns (string[] memory)'
  ];

  constructor() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Initialize the registry contract
   */
  private async initRegistry(): Promise<void> {
    if (this.registry) return;

    // Try to get registry address from environment first
    this.registryAddress = process.env.CONTRACT_REGISTRY_ADDRESS;
    
    // If not in env, try to fetch from deployment data
    if (!this.registryAddress) {
      try {
        const response = await fetch('http://localhost:8546/deployed');
        const deploymentData = await response.json();
        this.registryAddress = deploymentData.contracts?.ContractRegistry?.address;
      } catch (error) {
        console.warn('Could not fetch registry address from deployment server:', error);
      }
    }

    if (!this.registryAddress) {
      throw new Error('ContractRegistry address not found. Please deploy the registry first.');
    }

    this.registry = new ethers.Contract(this.registryAddress, this.registryABI, this.provider);
  }

  /**
   * Resolve a service name to contract address
   */
  async resolve(serviceName: string): Promise<string> {
    await this.initRegistry();
    
    try {
      const address = await this.registry!.resolve(serviceName);
      if (address === ethers.ZeroAddress) {
        throw new Error(`Service '${serviceName}' not found in registry`);
      }
      return address;
    } catch (error) {
      throw new Error(`Failed to resolve service '${serviceName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get service metadata
   */
  async getMetadata(serviceName: string): Promise<ParsedMetadata> {
    await this.initRegistry();
    
    try {
      const metadataJson = await this.registry!.getMetadata(serviceName);
      return JSON.parse(metadataJson || '{}');
    } catch (error) {
      console.warn(`Could not parse metadata for service '${serviceName}':`, error);
      return {};
    }
  }

  /**
   * Get complete service information
   */
  async getServiceInfo(serviceName: string): Promise<ServiceInfo> {
    await this.initRegistry();
    
    try {
      const serviceInfo = await this.registry!.getServiceInfo(serviceName);
      return {
        contractAddress: serviceInfo.contractAddress,
        metadata: serviceInfo.metadata,
        registeredAt: Number(serviceInfo.registeredAt),
        isActive: serviceInfo.isActive
      };
    } catch (error) {
      throw new Error(`Failed to get service info for '${serviceName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a service is active
   */
  async isServiceActive(serviceName: string): Promise<boolean> {
    await this.initRegistry();
    
    try {
      return await this.registry!.isServiceActive(serviceName);
    } catch (error) {
      console.warn(`Could not check service status for '${serviceName}':`, error);
      return false;
    }
  }

  /**
   * Get all registered services
   */
  async getAllServices(): Promise<string[]> {
    await this.initRegistry();
    
    try {
      return await this.registry!.getAllServices();
    } catch (error) {
      console.warn('Could not fetch all services:', error);
      return [];
    }
  }

  /**
   * Get services by contract address (reverse lookup)
   */
  async getServicesByContract(contractAddress: string): Promise<string[]> {
    await this.initRegistry();
    
    try {
      return await this.registry!.getServicesByContract(contractAddress);
    } catch (error) {
      console.warn(`Could not fetch services for contract ${contractAddress}:`, error);
      return [];
    }
  }

  /**
   * Get contract instance for a service
   */
  async getContract(serviceName: string, abi: any[]): Promise<ethers.Contract> {
    const address = await this.resolve(serviceName);
    return new ethers.Contract(address, abi, this.provider);
  }

  /**
   * Fallback to deployment data if registry fails
   */
  private async fallbackToDeploymentData(serviceName: string): Promise<string | null> {
    try {
      const response = await fetch('http://localhost:8546/deployed');
      const deploymentData = await response.json();
      return deploymentData.contracts?.[serviceName]?.address || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve with fallback to deployment data
   */
  async resolveWithFallback(serviceName: string): Promise<string> {
    try {
      return await this.resolve(serviceName);
    } catch (error) {
      console.warn(`Registry lookup failed for '${serviceName}', trying fallback...`);
      
      const fallbackAddress = await this.fallbackToDeploymentData(serviceName);
      if (fallbackAddress) {
        console.log(`Found '${serviceName}' via fallback: ${fallbackAddress}`);
        return fallbackAddress;
      }
      
      throw new Error(`Service '${serviceName}' not found in registry or deployment data`);
    }
  }

  /**
   * Get the registry address
   */
  getRegistryAddress(): string | null {
    return this.registryAddress;
  }
}

// Export singleton instance
export const contractRegistry = new ContractRegistryService();