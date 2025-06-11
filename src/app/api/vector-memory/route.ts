import { NextRequest, NextResponse } from 'next/server';
import { LangChainOrchestrator, ProcessingMode } from '../../../core/langchain-orchestrator';
import { CompanyMemoryRecord } from '../../../types/infrastructure';

// Singleton orchestrator instance
let orchestrator: LangChainOrchestrator | null = null;

async function getOrchestrator(): Promise<LangChainOrchestrator> {
  if (!orchestrator) {
    orchestrator = new LangChainOrchestrator();
    
    // Auto-configure with default models if available
    try {
      await orchestrator.configureModels({
        chatModel: {
          id: 'llama3.2:latest',
          name: 'Llama 3.2 Chat',
          type: 'ollama',
          processingMode: ProcessingMode.LLAMA_CHAT,
          temperature: 0.3,
          description: 'Default chat model for conversations'
        },
        toolsModel: {
          id: 'llama3-groq-tool-use:latest',
          name: 'Llama 3 Groq Tool Use',
          type: 'ollama',
          processingMode: ProcessingMode.OPENAI_TOOLS,
          temperature: 0.1,
          description: 'Groq-optimized Llama 3 model for structured tasks and function calling'
        }
      });
      console.log('✅ Auto-configured dual models successfully');
    } catch (error) {
      console.warn('⚠️ Could not auto-configure models, will use fallback mode:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  return orchestrator;
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();
    const orch = await getOrchestrator();

    switch (action) {
      case 'addCompany':
        const id = await orch.addCompanyToMemory(params.company);
        return NextResponse.json({ success: true, id });

      case 'searchCompanies':
        const searchResults = await orch.searchCompaniesInMemory(params.query, params.limit || 5);
        return NextResponse.json({ success: true, results: searchResults });

      case 'findSimilarCompanies':
        const similarResults = await orch.findSimilarCompanies(params.companyId, params.limit || 5);
        return NextResponse.json({ success: true, results: similarResults });

      case 'getAllCompanies':
        const allCompanies = await orch.getAllCompaniesFromMemory();
        return NextResponse.json({ success: true, companies: allCompanies });

      case 'updateCompany':
        await orch.updateCompanyInMemory(params.company);
        return NextResponse.json({ success: true });

      case 'createOrganization':
        const rootOrg = await orch.createRootOrganizationWithMemory(params.description);
        return NextResponse.json({ success: true, organization: rootOrg });

      case 'parseInfrastructure':
        const parsed = await orch.parseInfrastructureDescription(params.description);
        return NextResponse.json({ success: true, parsed });

      case 'addCompanyInfrastructure':
        const addedEntityId = await orch.addInfrastructureToCompany(params.companyId, params.entity);
        return NextResponse.json({ success: true, entityId: addedEntityId });

      case 'removeCompanyInfrastructure':
        await orch.removeInfrastructureFromCompany(params.companyId, params.entityId);
        return NextResponse.json({ success: true });

      case 'updateCompanyInfrastructure':
        await orch.updateCompanyInfrastructure(params.companyId, params.entity);
        return NextResponse.json({ success: true });

      case 'getCompanyInfrastructure':
        const infrastructure = await orch.getCompanyInfrastructure(params.companyId);
        return NextResponse.json({ success: true, infrastructure });

      case 'describeInfrastructureLayout':
        const layout = await orch.describeInfrastructureLayout(params.companyId);
        return NextResponse.json({ success: true, layout });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Vector memory API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}