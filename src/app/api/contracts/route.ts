import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Common contract ABIs for detecting contract types
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)'
];

const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256) view returns (string)'
];

interface ContractInfo {
  address: string;
  name: string;
  type: string;
  deployedAt?: string;
  deployer?: string;
  bytecode?: string;
  verified: boolean;
  metadata?: any;
}

interface DeployedContract {
  address: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
  usdcBalance?: string;
  deployer?: string;
  deployedAt?: string;
  description?: string;
}

interface DeploymentData {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: Record<string, DeployedContract>;
}

// Function to fetch deployment data from the Ethereum container
async function getDeploymentData(): Promise<DeploymentData | null> {
  try {
    // Try to fetch from the deployment server first
    const deploymentServerUrl = process.env.ETHEREUM_DEPLOYMENT_URL || 'http://localhost:8546';
    
    try {
      const response = await fetch(`${deploymentServerUrl}/deployment`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.contractsMap) {
          return {
            network: data.network.name,
            chainId: data.network.chainId,
            deployedAt: data.deployment.deployedAt,
            deployer: data.deployment.deployer,
            contracts: data.contractsMap
          };
        }
      }
    } catch (fetchError) {
      console.warn('Could not fetch from deployment server, using fallback:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
    }
    
    // Fallback: use known deployment data structure for development
    const fallbackData: DeploymentData = {
      network: 'localhost',
      chainId: 31337,
      deployedAt: new Date().toISOString(),
      deployer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      contracts: {
        USDC: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          symbol: 'USDC',
          decimals: 6,
          totalSupply: '1000000'
        },
        BridgeVault: {
          address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          usdcBalance: '100.0'
        },
        DAOFactory: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          deployer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          deployedAt: new Date().toISOString(),
          description: 'Factory contract for creating DAOs'
        }
      }
    };
    
    return fallbackData;
  } catch (error) {
    console.error('Failed to fetch deployment data:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const deploymentData = await getDeploymentData();
    
    if (!deploymentData) {
      return NextResponse.json(
        { success: false, error: 'Could not retrieve contract deployment data' },
        { status: 503 }
      );
    }
    
    // Transform the data into a more frontend-friendly format
    const contractsArray = Object.entries(deploymentData.contracts).map(([name, contract]) => ({
      name,
      address: contract.address,
      ...contract
    }));
    
    return NextResponse.json({
      success: true,
      network: {
        name: deploymentData.network,
        chainId: deploymentData.chainId,
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
      },
      deployment: {
        deployedAt: deploymentData.deployedAt,
        deployer: deploymentData.deployer
      },
      contracts: contractsArray,
      // Also provide a contracts map for easy access by name
      contractsMap: deploymentData.contracts
    });
    
  } catch (error) {
    console.error('Contracts API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST endpoint to refresh contract data (useful for development)
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'refresh') {
      // Force refresh of contract data
      const deploymentData = await getDeploymentData();
      
      if (!deploymentData) {
        return NextResponse.json(
          { success: false, error: 'Could not refresh contract deployment data' },
          { status: 503 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Contract data refreshed',
        contracts: deploymentData.contracts,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Contracts POST API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}