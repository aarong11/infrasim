import { NextRequest, NextResponse } from 'next/server';
import { LangChainOrchestrator, ProcessingMode } from '../../../core/langchain-orchestrator';
import { CompanyMemoryRecord } from '../../../types/infrastructure';

// Model registry interface
interface ModelInfo {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'lambda';
  processingMode: ProcessingMode;
}

// Settings service (duplicated for server-side use)
interface UserSettings {
  chatModel: string;
  toolsModel: string;
  ollamaHost: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  lambdaApiKey: string;
  temperature: number;
  maxRetries: number;
  modelMode: 'single' | 'dual'; // Add model mode setting
}

// Server-side default API keys (not exposed to frontend)
const SERVER_API_KEYS = {
  lambdaApiKey: process.env.LAMBDA_LABS_API_KEY || '', // Set via environment variable
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
};

const defaultSettings: UserSettings = {
  chatModel: 'llama-4-maverick-17b-128e-instruct-fp8',
  toolsModel: 'llama-4-maverick-17b-128e-instruct-fp8',
  ollamaHost: 'http://localhost:11434',
  openaiApiKey: '',
  anthropicApiKey: '',
  lambdaApiKey: '', // Removed default API key from client settings
  temperature: 0.1,
  maxRetries: 3,
  modelMode: 'single' // Default to single model mode
};

const modelRegistry: Record<string, ModelInfo> = {
  'llama-4-maverick-17b-128e-instruct-fp8': {
    id: 'llama-4-maverick-17b-128e-instruct-fp8',
    name: 'Llama 4 Maverick 17B (Lambda Labs)',
    type: 'lambda',
    processingMode: ProcessingMode.OPENAI_TOOLS
  },
  'llama-3.1-8b-instruct': {
    id: 'llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B Instruct (Lambda Labs)',
    type: 'lambda',
    processingMode: ProcessingMode.OPENAI_TOOLS
  },
  'nous-hermes2-mixtral:latest': {
    id: 'nous-hermes2-mixtral:latest',
    name: 'Nous Hermes 2 Mixtral',
    type: 'ollama',
    processingMode: ProcessingMode.OPENAI_TOOLS
  },
  'llama3.2:latest': {
    id: 'llama3.2:latest',
    name: 'Llama 3.2 Latest',
    type: 'ollama',
    processingMode: ProcessingMode.LLAMA_CHAT
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    type: 'openai',
    processingMode: ProcessingMode.OPENAI_TOOLS
  }
};

function getModelConfig(modelId: string, settings: UserSettings, isChatModel: boolean = false) {
  const modelInfo = modelRegistry[modelId];
  if (!modelInfo) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  // Log the model configuration for debugging
  const apiKey = modelInfo.type === 'lambda' ? settings.lambdaApiKey : 
                 modelInfo.type === 'openai' ? settings.openaiApiKey : undefined;
  
  console.log('🔧 Creating model config:', {
    modelId,
    modelType: modelInfo.type,
    isChatModel,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    settingsHasLambdaKey: !!settings.lambdaApiKey,
    lambdaKeyLength: settings.lambdaApiKey?.length || 0
  });

  return {
    id: modelInfo.id,
    name: modelInfo.name,
    type: modelInfo.type,
    processingMode: modelInfo.processingMode,
    temperature: isChatModel ? 0.3 : settings.temperature,
    apiKey: apiKey,
    description: `${modelInfo.name} - ${isChatModel ? 'Chat' : 'Tools'} model`
  };
}

// Singleton orchestrator instance and current settings
let orchestrator: LangChainOrchestrator | null = null;
let currentSettings: UserSettings = defaultSettings;

async function getOrchestrator(settings?: UserSettings): Promise<LangChainOrchestrator> {
  // Always create a fresh orchestrator with the provided settings when API keys are provided
  const activeSettings = settings || currentSettings;
  
  // If we have API keys in the request, create a fresh orchestrator to ensure proper configuration
  if (settings && (settings.lambdaApiKey || settings.openaiApiKey || settings.anthropicApiKey)) {
    console.log('🔄 Creating fresh orchestrator with provided API keys', {
      hasLambdaKey: !!settings.lambdaApiKey,
      hasOpenAIKey: !!settings.openaiApiKey,
      hasAnthropicKey: !!settings.anthropicApiKey,
      modelMode: settings.modelMode || 'single'
    });
    
    const freshOrchestrator = new LangChainOrchestrator();
    
    try {
      // In single model mode, use the tools model for both chat and tools operations
      const effectiveChatModel = activeSettings.modelMode === 'single' ? activeSettings.toolsModel : activeSettings.chatModel;
      
      const chatModelConfig = getModelConfig(effectiveChatModel, activeSettings, true);
      const toolsModelConfig = getModelConfig(activeSettings.toolsModel, activeSettings, false);
      
      await freshOrchestrator.configureModels({
        chatModel: chatModelConfig,
        toolsModel: toolsModelConfig,
        ollamaHost: activeSettings.ollamaHost
      });
      
      console.log('✅ Fresh orchestrator configured successfully', {
        mode: activeSettings.modelMode || 'single',
        chatModel: chatModelConfig.name,
        toolsModel: toolsModelConfig.name,
        timestamp: new Date().toISOString()
      });
      
      return freshOrchestrator;
    } catch (error) {
      console.warn('⚠️ Could not configure fresh orchestrator, falling back to singleton:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // Fallback to singleton orchestrator (for backward compatibility or when no API keys provided)
  if (!orchestrator) {
    orchestrator = new LangChainOrchestrator();
    
    try {
      const effectiveChatModel = activeSettings.modelMode === 'single' ? activeSettings.toolsModel : activeSettings.chatModel;
      
      const chatModelConfig = getModelConfig(effectiveChatModel, activeSettings, true);
      const toolsModelConfig = getModelConfig(activeSettings.toolsModel, activeSettings, false);
      
      console.log('🔧 Configuring singleton orchestrator with settings:', {
        mode: activeSettings.modelMode || 'dual',
        chatModel: chatModelConfig.name,
        toolsModel: toolsModelConfig.name,
        hasLambdaKey: !!activeSettings.lambdaApiKey,
        hasOpenAIKey: !!activeSettings.openaiApiKey,
        timestamp: new Date().toISOString()
      });
      
      await orchestrator.configureModels({
        chatModel: chatModelConfig,
        toolsModel: toolsModelConfig,
        ollamaHost: activeSettings.ollamaHost
      });
      
      console.log('✅ Singleton orchestrator configured successfully', {
        mode: activeSettings.modelMode || 'dual',
        chatModel: chatModelConfig.name,
        toolsModel: toolsModelConfig.name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('⚠️ Could not auto-configure models, will use fallback mode:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  return orchestrator;
}

export async function POST(request: NextRequest) {
  try {
    const { action, apiKeys, ...params } = await request.json();
    
    // Log incoming request details for debugging
    console.log('📥 Incoming API request:', {
      action,
      hasApiKeys: {
        lambda: !!apiKeys?.lambdaApiKey,
        openai: !!apiKeys?.openaiApiKey,
        anthropic: !!apiKeys?.anthropicApiKey
      },
      apiKeysLengths: {
        lambda: apiKeys?.lambdaApiKey?.length || 0,
        openai: apiKeys?.openaiApiKey?.length || 0,
        anthropic: apiKeys?.anthropicApiKey?.length || 0
      },
      modelConfig: {
        chatModel: params.chatModel,
        toolsModel: params.toolsModel,
        modelMode: params.modelMode
      },
      timestamp: new Date().toISOString()
    });
    
    // Create settings object from request data (including API keys)
    const requestSettings: UserSettings = {
      ...defaultSettings,
      ...params,
      // Use client API keys if provided, otherwise fall back to server keys
      lambdaApiKey: apiKeys?.lambdaApiKey || SERVER_API_KEYS.lambdaApiKey,
      openaiApiKey: apiKeys?.openaiApiKey || SERVER_API_KEYS.openaiApiKey,
      anthropicApiKey: apiKeys?.anthropicApiKey || SERVER_API_KEYS.anthropicApiKey,
    };
    
    console.log('🔧 Created request settings:', {
      modelMode: requestSettings.modelMode,
      hasLambdaKey: !!requestSettings.lambdaApiKey,
      lambdaKeyLength: requestSettings.lambdaApiKey?.length || 0,
      lambdaKeySource: apiKeys?.lambdaApiKey ? 'client' : (SERVER_API_KEYS.lambdaApiKey ? 'server' : 'none'),
      chatModel: requestSettings.chatModel,
      toolsModel: requestSettings.toolsModel,
      willCreateFreshOrchestrator: !!(requestSettings.lambdaApiKey || requestSettings.openaiApiKey || requestSettings.anthropicApiKey)
    });
    
    // Get orchestrator with the provided settings
    const orch = await getOrchestrator(requestSettings);

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

      case 'generateChatResponse':
        const chatResponse = await orch.generateChatResponse(params.message, params.context);
        return NextResponse.json({ success: true, response: chatResponse });

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

      case 'updateModelConfiguration':
        // Still support this for backwards compatibility, but it's no longer needed
        currentSettings = {
          ...defaultSettings,
          chatModel: params.chatModel || defaultSettings.chatModel,
          toolsModel: params.toolsModel || defaultSettings.toolsModel,
          ollamaHost: params.ollamaHost || defaultSettings.ollamaHost,
          lambdaApiKey: apiKeys?.lambdaApiKey || defaultSettings.lambdaApiKey,
          openaiApiKey: apiKeys?.openaiApiKey || defaultSettings.openaiApiKey,
          anthropicApiKey: apiKeys?.anthropicApiKey || defaultSettings.anthropicApiKey,
          modelMode: params.modelMode || 'single'
        };
        
        orchestrator = null; // Reset to force reconfiguration
        
        return NextResponse.json({ 
          success: true, 
          message: 'Configuration updated (legacy endpoint)',
          config: { mode: currentSettings.modelMode }
        });

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