import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface DeployedContract {
  address: string;
  deployer: string;
  deployedAt: string;
  description?: string;
  [key: string]: any;
}

interface DeploymentData {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: {
    [contractName: string]: DeployedContract;
  };
}

/**
 * GET /api/registry?name=ServiceName - Get specific service info
 * GET /api/registry - Get all services
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceName = searchParams.get('name');

    // Read deployment data from file
    const deployedPath = path.join(process.cwd(), 'ethereum', 'data', 'deployed.json');
    
    if (!fs.existsSync(deployedPath)) {
      return NextResponse.json({
        success: false,
        error: 'Deployment data not found. Please deploy contracts first.'
      }, { status: 404 });
    }

    const deploymentData: DeploymentData = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const contracts = deploymentData.contracts;

    if (serviceName) {
      // Get specific service
      const contract = contracts[serviceName];
      if (!contract) {
        return NextResponse.json({
          success: false,
          error: `Service '${serviceName}' not found`
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        service: {
          name: serviceName,
          address: contract.address,
          description: contract.description || `${serviceName} contract`,
          deployer: contract.deployer,
          deployedAt: contract.deployedAt,
          network: deploymentData.network,
          chainId: deploymentData.chainId
        }
      });
    } else {
      // Get all services
      const services = Object.entries(contracts).map(([name, contract]) => ({
        name,
        address: contract.address,
        description: contract.description || `${name} contract`,
        deployer: contract.deployer,
        deployedAt: contract.deployedAt
      }));

      return NextResponse.json({
        success: true,
        registryAddress: contracts.ContractRegistry?.address || null,
        network: deploymentData.network,
        chainId: deploymentData.chainId,
        totalServices: services.length,
        services
      });
    }
  } catch (error) {
    console.error('Registry API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}