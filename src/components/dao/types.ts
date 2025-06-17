export interface DAOData {
  // Company Setup
  name: string;
  symbol: string;
  purpose: string;
  jurisdiction: string;
  metadata: string;
  
  // Roles Setup
  roles: Array<{
    name: string;
    description: string;
    permissions: string[];
    walletAddress?: string; // Add wallet address field
  }>;
  
  // Constitution & Ceremonies
  constitution: string;
  ceremonies: string;
  
  // Share Allocation
  shareAllocations: Array<{
    address: string;
    percentage: number;
    role: string;
  }>;
}

export interface DeploymentInfo {
  networkName: string;
  rpcEndpoint: string;
  daoFactoryAddress: string;
}

export type WizardStep = 'company' | 'roles' | 'constitution' | 'shares' | 'deploy';