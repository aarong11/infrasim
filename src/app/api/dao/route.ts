import { NextRequest, NextResponse } from 'next/server';
import { ethers, Contract } from 'ethers';

// Get provider and contract setup
const getProvider = () => {
  const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

const getDAOFactoryContract = async () => {
  const provider = getProvider();
  
  // Get deployed contract address from deployment data
  try {
    const deploymentResponse = await fetch('http://localhost:8546/deployed');
    const deploymentData = await deploymentResponse.json();
    
    if (!deploymentData.DAOFactory) {
      throw new Error('DAOFactory contract not found in deployment data');
    }

    const contractAddress = deploymentData.DAOFactory.address;
    const contractABI = deploymentData.DAOFactory.abi;
    
    return new ethers.Contract(contractAddress, contractABI, provider);
  } catch (error) {
    console.error('Failed to get DAO Factory contract:', error);
    throw new Error('DAO Factory contract not available');
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daoId = searchParams.get('daoId');
    
    if (!daoId) {
      return NextResponse.json({ error: 'DAO ID is required' }, { status: 400 });
    }

    const contract = await getDAOFactoryContract();
    const dao = await (contract as any).getDAO(parseInt(daoId));
    
    return NextResponse.json({
      success: true,
      dao: {
        id: parseInt(daoId),
        name: dao.name,
        symbol: dao.symbol,
        jurisdiction: dao.jurisdiction,
        mission: dao.mission,
        constitution: dao.constitution,
        creator: dao.creator,
        members: dao.members,
        roles: dao.roles
      }
    });
  } catch (error) {
    console.error('Error fetching DAO:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch DAO'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create':
        return await createDAO(body);
      case 'get':
        return await getDAOByAddress(body);
      case 'list':
        return await listAllDAOs();
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DAO API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

async function createDAO(body: any) {
  const {
    name,
    symbol,
    jurisdiction,
    mission,
    constitution,
    roles = [],
    roleHolders = [],
    createCompany = false,
    companyData
  } = body;

  if (!name || !symbol || !jurisdiction || !mission) {
    return NextResponse.json({
      success: false,
      error: 'Missing required fields: name, symbol, jurisdiction, mission'
    }, { status: 400 });
  }

  try {
    const provider = getProvider();
    const contract = await getDAOFactoryContract();
    
    // Get a signer (for demo purposes, use the first account)
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts available for signing');
    }
    
    const signer = await provider.getSigner(accounts[0].address);
    const contractWithSigner = contract.connect(signer);

    // Create the DAO - use type assertion to access custom methods
    const tx = await (contractWithSigner as any).createDAO(
      name,
      symbol,
      jurisdiction,
      mission,
      constitution || '',
      roles,
      roleHolders
    );

    const receipt = await tx.wait();
    
    // Extract DAO ID from events
    let daoId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'DAOCreated') {
          const totalDAOs = await (contract as any).totalDAOs();
          daoId = Number(totalDAOs) - 1;
          break;
        }
      } catch (e) {
        // Skip unparseable logs
      }
    }

    if (daoId === null) {
      throw new Error('Failed to extract DAO ID from transaction');
    }

    const contractAddress = await contract.getAddress();
    let companyId = null;

    // Create company if requested
    if (createCompany && companyData) {
      try {
        // Add DAO contract address to company data
        const companyRecord = {
          ...companyData,
          daoContractAddress: contractAddress,
          metadata: {
            ...companyData.metadata,
            daoId,
            transactionHash: tx.hash,
            createdViaDAO: true
          }
        };

        // Create company using vector memory service
        const response = await fetch('http://localhost:3000/api/vector-memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'addCompany',
            company: {
              id: crypto.randomUUID(),
              ...companyRecord,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        });

        const companyResult = await response.json();
        if (companyResult.success) {
          companyId = companyResult.id;
        } else {
          console.warn('Failed to create company record:', companyResult.error);
        }
      } catch (error) {
        console.warn('Failed to create company record:', error);
        // Don't fail the entire operation if company creation fails
      }
    }

    return NextResponse.json({
      success: true,
      daoId,
      companyId,
      transactionHash: tx.hash,
      contractAddress,
      message: `DAO "${name}" created successfully${companyId ? ' with company record' : ''}`
    });

  } catch (error) {
    console.error('Error creating DAO:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create DAO'
    }, { status: 500 });
  }
}

async function getDAOByAddress(body: any) {
  const { contractAddress, daoId } = body;
  
  try {
    const contract = await getDAOFactoryContract();
    
    if (daoId !== undefined) {
      const dao = await (contract as any).getDAO(parseInt(daoId));
      return NextResponse.json({
        success: true,
        dao: {
          id: parseInt(daoId),
          name: dao.name,
          symbol: dao.symbol,
          jurisdiction: dao.jurisdiction,
          mission: dao.mission,
          constitution: dao.constitution,
          creator: dao.creator,
          members: dao.members,
          roles: dao.roles
        }
      });
    }
    
    // If no specific DAO ID, try to find by contract address or return all DAOs
    const totalDAOs = await (contract as any).totalDAOs();
    const allDAOs = [];
    
    for (let i = 0; i < Number(totalDAOs); i++) {
      try {
        const dao = await (contract as any).getDAO(i);
        allDAOs.push({
          id: i,
          name: dao.name,
          symbol: dao.symbol,
          jurisdiction: dao.jurisdiction,
          mission: dao.mission,
          constitution: dao.constitution,
          creator: dao.creator,
          members: dao.members,
          roles: dao.roles
        });
      } catch (e) {
        console.warn(`Failed to fetch DAO ${i}:`, e);
      }
    }
    
    return NextResponse.json({
      success: true,
      daos: allDAOs,
      total: Number(totalDAOs)
    });
    
  } catch (error) {
    console.error('Error fetching DAO by address:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch DAO'
    }, { status: 500 });
  }
}

async function listAllDAOs() {
  try {
    const contract = await getDAOFactoryContract();
    const totalDAOs = await (contract as any).totalDAOs();
    const daos = [];
    
    for (let i = 0; i < Number(totalDAOs); i++) {
      try {
        const dao = await (contract as any).getDAO(i);
        daos.push({
          id: i,
          name: dao.name,
          symbol: dao.symbol,
          jurisdiction: dao.jurisdiction,
          mission: dao.mission,
          constitution: dao.constitution,
          creator: dao.creator,
          members: dao.members,
          roles: dao.roles
        });
      } catch (e) {
        console.warn(`Failed to fetch DAO ${i}:`, e);
      }
    }
    
    return NextResponse.json({
      success: true,
      daos,
      total: Number(totalDAOs)
    });
    
  } catch (error) {
    console.error('Error listing DAOs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list DAOs'
    }, { status: 500 });
  }
}