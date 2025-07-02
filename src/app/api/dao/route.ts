import { NextRequest, NextResponse } from 'next/server';
import { DAOService, CreateDAOParams, DAOInfo } from '@shared/services/dao-service';
import { WalletAdapterFactory } from '@shared/services/wallet-adapter-factory';
import { LangChainOrchestrator } from '../../../core/langchain-orchestrator';
import { CompanyMemoryRecord } from '../../../types/infrastructure';

// Server-side default API keys (not exposed to frontend)
const SERVER_API_KEYS = {
  lambdaApiKey: process.env.LAMBDA_LABS_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
};

// Initialize the RPC provider
WalletAdapterFactory.initializeProvider(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545');

// Create a server-side wallet for contract interactions
// In a real implementation, this would be a proper server wallet or admin account
const createServerWallet = () => {
  const privateKey = process.env.ETHEREUM_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  return {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Default Hardhat account
    privateKey
  };
};

// Get or create orchestrator instance
let orchestrator: LangChainOrchestrator | null = null;
async function getOrchestrator() {
  if (!orchestrator) {
    orchestrator = new LangChainOrchestrator(
      process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    );
  }
  return orchestrator;
}

// Create DAO service instance
const createDAOService = () => {
  const serverWallet = createServerWallet();
  const walletAdapter = WalletAdapterFactory.createSelfHostedAdapter(serverWallet);
  return new DAOService(walletAdapter.provider);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daoId = searchParams.get('daoId');
    
    const daoService = createDAOService();
    
    if (daoId) {
      // Get specific DAO by index
      const result = await daoService.getDAOAddress(parseInt(daoId));
      
      if (!result.success) {
        return NextResponse.json({ 
          success: false, 
          error: result.error 
        }, { status: 404 });
      }

      const creatorResult = await daoService.getDAOCreator(result.data!);
      
      return NextResponse.json({
        success: true,
        dao: {
          id: parseInt(daoId),
          address: result.data,
          creator: creatorResult.success ? creatorResult.data : 'Unknown',
          name: `DAO ${parseInt(daoId) + 1}`, // Could be enhanced to get actual name
          description: 'DAO Description' // Could be enhanced to get actual description
        }
      });
    } else {
      // Get all DAOs
      const result = await daoService.getAllDAOs();
      
      if (!result.success) {
        return NextResponse.json({ 
          success: false, 
          error: result.error 
        }, { status: 500 });
      }

      const totalResult = await daoService.getTotalDAOs();
      
      return NextResponse.json({
        success: true,
        daos: result.data || [],
        total: totalResult.success ? totalResult.data : 0
      });
    }
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
    const { action, ...params } = await request.json();
    
    console.log('📥 DAO API request:', {
      action,
      timestamp: new Date().toISOString()
    });

    const daoService = createDAOService();
    const orch = await getOrchestrator();

    switch (action) {
      case 'create':
        return await createDAO(params, daoService, orch);
      
      case 'list':
        const listResult = await daoService.getAllDAOs();
        return NextResponse.json({
          success: listResult.success,
          daos: listResult.data || [],
          error: listResult.error
        });
      
      case 'get':
        const { daoId } = params;
        const getResult = await daoService.getDAOAddress(daoId);
        
        if (!getResult.success) {
          return NextResponse.json({
            success: false,
            error: getResult.error
          }, { status: 404 });
        }

        const creatorResult = await daoService.getDAOCreator(getResult.data!);
        
        return NextResponse.json({
          success: true,
          dao: {
            id: daoId,
            address: getResult.data,
            creator: creatorResult.success ? creatorResult.data : 'Unknown',
            name: `DAO ${daoId + 1}`,
            description: 'DAO Description'
          }
        });
      
      case 'estimate-gas':
        const { name, description, votingPeriod, proposalThreshold } = params;
        const estimateParams: CreateDAOParams = {
          name,
          description,
          votingPeriod: votingPeriod || 86400, // 1 day default
          proposalThreshold: proposalThreshold || 1
        };
        
        const gasResult = await daoService.estimateCreateDAOGas(estimateParams);
        return NextResponse.json(gasResult);
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('DAO API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function createDAO(params: any, daoService: DAOService, orch: LangChainOrchestrator) {
  const {
    name,
    description,
    votingPeriod = 86400, // 1 day default
    proposalThreshold = 1,
    createCompany = false,
    companyData
  } = params;

  if (!name || !description) {
    return NextResponse.json({
      success: false,
      error: 'Missing required fields: name, description'
    }, { status: 400 });
  }

  try {
    let companyId: string | null = null;

    // Create company first if requested
    if (createCompany && companyData) {
      const companyRecord: Omit<CompanyMemoryRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        name: companyData.name,
        description: companyData.description,
        sectorTags: companyData.sectorTags || ['🏛️ DAO', '🏢 Organization'],
        services: companyData.services || ['Decentralized Governance'],
        metadata: {
          industry: companyData.metadata?.industry || 'governance',
          compliance: companyData.metadata?.compliance || [],
          daoManaged: true,
          ...companyData.metadata
        }
      };
      
      companyId = await orch.addCompanyToMemory(companyRecord);
      console.log('✅ Created company:', companyId);
    }

    // Create DAO using the shared service
    const createParams: CreateDAOParams = {
      name,
      description,
      votingPeriod,
      proposalThreshold
    };

    const result = await daoService.createDAO(createParams);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    // Get the total number of DAOs to determine the new DAO ID
    const totalResult = await daoService.getTotalDAOs();
    const daoId = totalResult.success ? totalResult.data! - 1 : 0;

    console.log('✅ DAO creation successful:', {
      daoId,
      name,
      txHash: result.txHash,
      companyId
    });

    return NextResponse.json({
      success: true,
      message: `DAO '${name}' created successfully`,
      daoId,
      companyId,
      transactionHash: result.txHash,
      dao: {
        id: daoId,
        name,
        description,
        votingPeriod,
        proposalThreshold,
        companyId
      }
    });

  } catch (error) {
    console.error('Error creating DAO:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create DAO'
    }, { status: 500 });
  }
}