import { 
  ToolAction,
  CreateCompanyAction,
  GenerateApiAction,
  LinkEntitiesAction,
  ExpandInfrastructureAction,
  SearchCompaniesAction,
  ControlSimulationAction,
  ModifyInfrastructureAction,
  ChatActionSchema
} from './schema';
import { z } from 'zod';
import { CompanyMemoryRecord, InfrastructureEntity, EntityType, FidelityLevel, Port } from '../types/infrastructure';
import { useAppStore, AppContext } from '../store/app-store';
import { v4 as uuidv4 } from 'uuid';
import { APIThrottler } from '../utils/api-throttler';

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: Date;
}

export class ToolHandlers {
  private apiThrottler = new APIThrottler({
    minInterval: 1000,
    maxBackoff: 30000,
    maxRetries: 3,
    baseBackoff: 2000
  });

  constructor(ollamaBaseUrl: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434') {
    // Client-side version - no server imports
  }

  async initialize(): Promise<void> {
    console.log('✅ Tool handlers initialized (client-side)');
  }

  private getApiKeys() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('infrasim-settings');
        if (stored) {
          const settings = JSON.parse(stored);
          return {
            lambdaApiKey: settings.lambdaApiKey || '',
            openaiApiKey: settings.openaiApiKey || '',
            anthropicApiKey: settings.anthropicApiKey || '',
            chatModel: settings.chatModel || 'llama-4-maverick-17b-128e-instruct-fp8',
            toolsModel: settings.toolsModel || 'llama-4-maverick-17b-128e-instruct-fp8',
            modelMode: settings.modelMode || 'single',
            ollamaHost: settings.ollamaHost || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            temperature: settings.temperature || 0.1
          };
        }
      } catch (error) {
        console.warn('Failed to get settings from localStorage:', error);
      }
    }
    return {
      lambdaApiKey: '',
      openaiApiKey: '',
      anthropicApiKey: '',
      chatModel: 'llama-4-maverick-17b-128e-instruct-fp8',
      toolsModel: 'llama-4-maverick-17b-128e-instruct-fp8',
      modelMode: 'single',
      ollamaHost: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      temperature: 0.1
    };
  }

  private async makeApiCall(action: string, params: any) {
    const settings = this.getApiKeys();
    
    console.log('🔄 Making API call:', {
      action,
      hasLambdaKey: !!settings.lambdaApiKey,
      hasOpenAIKey: !!settings.openaiApiKey,
      lambdaKeyLength: settings.lambdaApiKey?.length || 0,
      modelMode: settings.modelMode,
      chatModel: settings.chatModel,
      toolsModel: settings.toolsModel,
      timestamp: new Date().toISOString()
    });
    
    const requestBody = {
      action,
      apiKeys: {
        lambdaApiKey: settings.lambdaApiKey,
        openaiApiKey: settings.openaiApiKey,
        anthropicApiKey: settings.anthropicApiKey
      },
      chatModel: settings.chatModel,
      toolsModel: settings.toolsModel,
      modelMode: settings.modelMode,
      ollamaHost: settings.ollamaHost,
      temperature: settings.temperature,
      ...params
    };
    
    const response = await this.apiThrottler.throttledCall(
      () => fetch('/api/vector-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }),
      `tool-${action}`
    );

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'API call failed');
    }

    return result;
  }

  async executeAction(action: ToolAction, context?: AppContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    console.log('🔧 Executing Tool Action', {
      action: action.action,
      parameters: Object.keys(action.parameters),
      context: context?.mode,
      timestamp: new Date().toISOString()
    });

    const { addToolCall, updateToolCall } = useAppStore.getState();
    const toolCallId = Math.random().toString(36).substr(2, 9);
    
    addToolCall({
      toolName: action.action,
      parameters: action.parameters,
      status: 'pending',
      context: context || { mode: 'general_assistance', viewState: {} }
    });

    try {
      let result: ToolExecutionResult;

      switch (action.action) {
        case 'createCompany':
          result = await this.handleCreateCompany(action, context);
          break;
        case 'generateApi':
          result = await this.handleGenerateApi(action);
          break;
        case 'linkEntities':
          result = await this.handleLinkEntities(action);
          break;
        case 'expandInfrastructure':
          result = await this.handleExpandInfrastructure(action);
          break;
        case 'searchCompanies':
          result = await this.handleSearchCompanies(action, context);
          break;
        case 'controlSimulation':
          result = await this.handleControlSimulation(action);
          break;
        case 'modifyInfrastructure':
          result = await this.handleModifyInfrastructure(action);
          break;
        case 'chat':
          result = await this.handleChat(action, context);
          break;
        case 'executePlugin':
          result = await this.handleExecutePlugin(action, context);
          break;
        case 'createPlugin':
          result = await this.handleCreatePlugin(action, context);
          break;
        case 'listPlugins':
          result = await this.handleListPlugins(action, context);
          break;
        default:
          result = {
            success: false,
            message: 'Unknown action type',
            error: `Action '${(action as any).action}' is not supported`,
            timestamp: new Date()
          };
      }

      const duration = Date.now() - startTime;
      updateToolCall(toolCallId, {
        status: 'success',
        result: result.data,
        duration
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      updateToolCall(toolCallId, {
        status: 'error',
        error: errorMessage,
        duration
      });

      return {
        success: false,
        message: 'Tool execution failed',
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Reset API throttling for manual refresh
   */
  resetThrottling(): void {
    this.apiThrottler.resetAll();
  }

  private async handleCreateCompany(action: CreateCompanyAction, context?: AppContext): Promise<ToolExecutionResult> {
    const { parameters } = action;
    
    const sectorTags = this.generateSectorTags(parameters.industry, parameters.tags);
    
    const companyRecord: Omit<CompanyMemoryRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      name: parameters.name,
      description: parameters.description,
      sectorTags,
      services: parameters.services,
      metadata: {
        industry: parameters.industry,
        jurisdiction: parameters.jurisdiction,
        compliance: parameters.compliance || [],
        employees: parameters.employees,
        founded: parameters.founded,
        headquarters: parameters.headquarters,
        source: 'tool_creation',
        creationContext: context?.mode
      }
    };

    try {
      const result = await this.makeApiCall('createCompany', {
        company: companyRecord,
        description: parameters.description
      });

      if (context?.mode === 'company_management') {
        const { updateContext } = useAppStore.getState();
        updateContext({ currentCompanyId: result.companyId });
      }

      return {
        success: true,
        message: `Successfully created company '${parameters.name}' with ID ${result.companyId}`,
        data: {
          companyId: result.companyId,
          company: { ...companyRecord, id: result.companyId },
          rootEntity: result.rootEntity,
          sectorTags,
          contextUpdated: context?.mode === 'company_management'
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create company',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async handleGenerateApi(action: GenerateApiAction): Promise<ToolExecutionResult> {
    const { parameters } = action;
    
    try {
      const companies = await this.makeApiCall('getAllCompanies', {});
      const company = companies.companies?.find((c: any) => c.id === parameters.companyId);
      
      if (!company) {
        return {
          success: false,
          message: 'Company not found',
          error: `Company with ID ${parameters.companyId} does not exist`,
          timestamp: new Date()
        };
      }

      const apiEntity: Partial<InfrastructureEntity> = {
        type: EntityType.API_SERVICE,
        name: parameters.serviceName,
        hostname: `${parameters.serviceName.toLowerCase().replace(/\s+/g, '-')}.${company.name.toLowerCase().replace(/\s+/g, '')}.local`,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        fidelity: FidelityLevel.CONCRETE,
        ports: [
          {
            number: parameters.apiType === 'grpc' ? 50051 : (parameters.apiType === 'websocket' ? 8080 : 443),
            protocol: 'tcp',
            service: parameters.apiType,
            status: 'open'
          }
        ],
        metadata: {
          apiType: parameters.apiType,
          authentication: parameters.authentication,
          rateLimit: parameters.rateLimit,
          endpoints: parameters.endpoints.map(ep => `${ep.method} ${ep.path}`),
          companyId: parameters.companyId,
          generatedAt: new Date().toISOString()
        },
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        connections: []
      };

      return {
        success: true,
        message: `Generated ${parameters.apiType.toUpperCase()} API '${parameters.serviceName}' for ${company.name}`,
        data: {
          apiEntity,
          company: company.name,
          endpointCount: parameters.endpoints.length,
          apiSpec: {
            name: parameters.serviceName,
            type: parameters.apiType,
            baseUrl: `https://${apiEntity.hostname}`,
            authentication: parameters.authentication,
            endpoints: parameters.endpoints
          }
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate API',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async handleLinkEntities(action: LinkEntitiesAction): Promise<ToolExecutionResult> {
    const { parameters } = action;
    
    const connection = {
      id: uuidv4(),
      sourceEntityId: parameters.sourceEntityId,
      targetEntityId: parameters.targetEntityId,
      connectionType: parameters.connectionType,
      protocol: parameters.protocol || 'tcp',
      port: parameters.port,
      bidirectional: parameters.bidirectional,
      description: parameters.description,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      message: `Successfully linked entities with ${parameters.connectionType} connection`,
      data: {
        connection,
        linkType: parameters.connectionType,
        bidirectional: parameters.bidirectional
      },
      timestamp: new Date()
    };
  }

  private async handleExpandInfrastructure(action: ExpandInfrastructureAction): Promise<ToolExecutionResult> {
    const { parameters } = action;
    
    try {
      const companies = await this.makeApiCall('getAllCompanies', {});
      const company = companies.companies?.find((c: any) => c.id === parameters.companyId);
      
      if (!company) {
        return {
          success: false,
          message: 'Company not found',
          error: `Company with ID ${parameters.companyId} does not exist`,
          timestamp: new Date()
        };
      }

      const ports: Port[] = (parameters.ports || []).map(p => ({
        number: p.number || 80,
        protocol: p.protocol || 'tcp',
        service: p.service || 'http',
        status: p.status || 'open'
      }));

      const newEntity: Partial<InfrastructureEntity> = {
        type: this.mapStringToEntityType(parameters.entityType),
        name: parameters.name,
        hostname: parameters.hostname,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        fidelity: FidelityLevel.CONCRETE,
        ports,
        metadata: {
          ...parameters.metadata,
          companyId: parameters.companyId,
          createdAt: new Date().toISOString(),
          expandedInfrastructure: true
        },
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        connections: []
      };

      return {
        success: true,
        message: `Added ${parameters.entityType} '${parameters.name}' to ${company.name}'s infrastructure`,
        data: {
          entity: newEntity,
          company: company.name,
          entityType: parameters.entityType,
          hostname: parameters.hostname
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to expand infrastructure',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async handleSearchCompanies(action: SearchCompaniesAction, context?: AppContext): Promise<ToolExecutionResult> {
    const { parameters } = action;
    
    try {
      let results;
      
      if (parameters.query) {
        results = await this.makeApiCall('searchCompanies', {
          query: parameters.query,
          limit: parameters.limit
        });
        results = results.results || [];
      } else {
        const allCompanies = await this.makeApiCall('getAllCompanies', {});
        results = (allCompanies.companies || [])
          .filter((company: any) => {
            if (parameters.industry && company.metadata?.industry !== parameters.industry) {
              return false;
            }
            if (parameters.tags && parameters.tags.length > 0) {
              const hasMatchingTag = parameters.tags.some(tag => 
                company.sectorTags.some((sectorTag: string) => 
                  sectorTag.toLowerCase().includes(tag.toLowerCase())
                )
              );
              if (!hasMatchingTag) return false;
            }
            return true;
          })
          .slice(0, parameters.limit)
          .map((company: any) => ({ record: company, score: 1.0, similarity: 1.0 }));
      }

      return {
        success: true,
        message: `Found ${results.length} companies matching your criteria`,
        data: {
          companies: results,
          totalResults: results.length,
          searchQuery: parameters.query,
          filters: {
            industry: parameters.industry,
            tags: parameters.tags
          },
          contextMode: context?.mode
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to search companies',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async handleControlSimulation(action: ControlSimulationAction): Promise<ToolExecutionResult> {
    const { parameters } = action;
    let result: any;
    
    // Since we can't import SimulationEngine on client-side, we'll make API calls
    try {
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: parameters.command,
          tickRate: parameters.tickRate,
          targetEntityId: parameters.targetEntityId
        })
      });

      if (!response.ok) throw new Error(`Simulation API failed: ${response.statusText}`);
      
      result = await response.json();

      return {
        success: true,
        message: `Simulation ${parameters.command} executed successfully`,
        data: {
          command: parameters.command,
          simulationState: result.state,
          tickRate: parameters.tickRate,
          targetEntity: parameters.targetEntityId,
          result
        },
        timestamp: new Date()
      };
    } catch (error) {
      // Fallback simulation response
      return {
        success: true,
        message: `Simulation ${parameters.command} executed (simulated)`,
        data: {
          command: parameters.command,
          simulationState: { status: parameters.command, tickRate: parameters.tickRate },
          tickRate: parameters.tickRate,
          targetEntity: parameters.targetEntityId,
          result: { status: parameters.command }
        },
        timestamp: new Date()
      };
    }
  }

  private async handleModifyInfrastructure(action: ModifyInfrastructureAction): Promise<ToolExecutionResult> {
    const { parameters } = action;
    const { companyId, operation, entity, entityId, layoutInstructions } = parameters;

    try {
      switch (operation) {
        case 'add':
          if (!entity || !entity.type || !entity.name) {
            return {
              success: false,
              message: 'Entity type and name are required for add operation',
              error: 'Missing required entity fields',
              timestamp: new Date()
            };
          }

          const newEntity: InfrastructureEntity = {
            id: entity.id || uuidv4(),
            type: this.mapStringToEntityType(entity.type),
            name: entity.name,
            hostname: entity.hostname || `${entity.name.toLowerCase().replace(/\s+/g, '')}.local`,
            ip: entity.ip || `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            fidelity: FidelityLevel.VIRTUAL,
            ports: entity.ports?.map(p => ({
              number: p.number || 80,
              protocol: p.protocol || 'tcp',
              service: p.service || 'http',
              status: p.status || 'open'
            })) || [],
            metadata: entity.metadata || {},
            position: entity.position ? 
              { x: entity.position.x || 0, y: entity.position.y || 0 } : 
              this.calculateLayoutPosition(layoutInstructions),
            connections: [],
            logs: []
          };

          return {
            success: true,
            message: `Added ${entity.type} '${entity.name}' to company infrastructure`,
            data: {
              entity: newEntity,
              operation: 'add'
            },
            timestamp: new Date()
          };

        case 'remove':
          return {
            success: true,
            message: `Removed entity from company infrastructure`,
            data: {
              entityId: entityId,
              operation: 'remove'
            },
            timestamp: new Date()
          };

        case 'update':
          if (!entity) {
            return {
              success: false,
              message: 'Entity data required for update operation',
              error: 'Missing entity data',
              timestamp: new Date()
            };
          }

          return {
            success: true,
            message: `Updated entity '${entity.name}' in company infrastructure`,
            data: {
              entity: entity,
              operation: 'update'
            },
            timestamp: new Date()
          };

        case 'describe':
          return {
            success: true,
            message: 'Generated infrastructure layout description',
            data: {
              description: 'Infrastructure layout description would be generated here',
              operation: 'describe'
            },
            timestamp: new Date()
          };

        default:
          return {
            success: false,
            message: `Unknown operation: ${operation}`,
            error: 'Invalid operation',
            timestamp: new Date()
          };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to modify infrastructure',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async handleChat(action: z.infer<typeof ChatActionSchema>, context?: AppContext): Promise<ToolExecutionResult> {
    const { parameters } = action;
    const { message, messages } = parameters;

    try {
      // Enhanced context gathering for better visibility
      const enhancedContext = await this.gatherCompanyContext(parameters.context);
      
      // Get user settings for API key and model configuration
      const settings = this.getApiKeys();
      
      // Prepare messages array for the lambda proxy
      let chatMessages = [];
      
      // If we have the full messages array from the schema, use it
      if (messages && messages.length > 0) {
        chatMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      } else {
        // Fallback: create a simple message array with system context
        const systemContext = this.getContextInstructions(context);
        chatMessages = [
          {
            role: 'system',
            content: systemContext || 'You are a helpful AI assistant for infrastructure management.'
          },
          {
            role: 'user',
            content: message
          }
        ];
      }

      // Add infrastructure context to system message if available
      if (enhancedContext.currentInfrastructureJSON) {
        const systemMessage = chatMessages.find(msg => msg.role === 'system');
        if (systemMessage) {
          systemMessage.content += `\n\n🏗️ CURRENT INFRASTRUCTURE CONTEXT:\n${enhancedContext.currentInfrastructureJSON}`;
        }
      }

      // Make direct call to lambda proxy instead of vector-memory endpoint
      const response = await fetch('/api/lambda-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.lambdaApiKey,
          model: settings.chatModel,
          messages: chatMessages,
          temperature: settings.temperature,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Lambda proxy error: ${error.error || response.statusText}`);
      }

      const result = await response.json();
      const assistantResponse = result.choices?.[0]?.message?.content || 'I apologize, but I couldn\'t generate a proper response.';

      return {
        success: true,
        message: assistantResponse,
        data: {
          conversationType: 'direct_lambda_proxy',
          context: enhancedContext,
          contextMode: context?.mode,
          userMessage: message,
          messagesUsed: chatMessages.length,
          model: settings.chatModel,
          usage: result.usage
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error in lambda proxy chat handler:', error);
      
      // Enhanced fallback response with more context awareness
      const fallbackResponse = this.generateContextAwareFallbackResponse(message, context);
      
      return {
        success: true,
        message: fallbackResponse,
        data: {
          conversationType: 'context_aware_fallback',
          context: context || {},
          userMessage: message,
          error: error instanceof Error ? error.message : 'Lambda proxy API unavailable'
        },
        timestamp: new Date()
      };
    }
  }

  private async handleExecutePlugin(action: any, context?: AppContext): Promise<ToolExecutionResult> {
    try {
      const response = await fetch('/api/plugins/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pluginName: action.parameters.pluginName,
          parameters: action.parameters.parameters,
          environment: action.parameters.environment,
          task: action.parameters.task,
          context
        })
      });

      if (!response.ok) throw new Error(`Plugin execution failed: ${response.statusText}`);
      
      const result = await response.json();
      return {
        success: result.success,
        message: result.success ? 
          `Plugin '${action.parameters.pluginName}' executed successfully` : 
          `Plugin '${action.parameters.pluginName}' execution failed`,
        data: result.data,
        error: result.error,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute plugin '${action.parameters.pluginName}'`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async handleCreatePlugin(action: any, context?: AppContext): Promise<ToolExecutionResult> {
    try {
      const response = await fetch('/api/plugins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: action.parameters.name,
          description: action.parameters.description,
          environment: action.parameters.environment,
          code: action.parameters.code,
          parameters: action.parameters.parameters,
          context
        })
      });

      if (!response.ok) throw new Error(`Plugin creation failed: ${response.statusText}`);
      
      const result = await response.json();
      return {
        success: result.success,
        message: `Plugin '${action.parameters.name}' created successfully`,
        data: result.data,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create plugin '${action.parameters.name}'`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async handleListPlugins(action: any, context?: AppContext): Promise<ToolExecutionResult> {
    try {
      const response = await fetch('/api/plugins/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: action.parameters.environment,
          search: action.parameters.search
        })
      });

      if (!response.ok) throw new Error(`Failed to list plugins: ${response.statusText}`);
      
      const result = await response.json();
      return {
        success: true,
        message: `Found ${result.data.plugins.length} plugins`,
        data: result.data,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to list plugins',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  // Helper methods
  private getContextInstructions(context?: AppContext): string {
    if (!context) return '';

    switch (context.mode) {
      case 'infrastructure_management':
        return `[CONTEXT: Infrastructure Management Mode] Focus on infrastructure components, networking, and technical configurations. ${context.currentEntityId ? `Currently working with entity: ${context.currentEntityId}` : ''}`;
      
      case 'company_management':
        return `[CONTEXT: Company Management Mode] Focus on company operations, business context, and organizational infrastructure. ${context.currentCompanyId ? `Currently managing company: ${context.currentCompanyId}` : ''}`;
      
      case 'api_management':
        return `[CONTEXT: API Management Mode] Focus on API design, endpoints, integration patterns, and service architecture.`;
      
      case 'simulation_control':
        return `[CONTEXT: Simulation Control Mode] Focus on simulation operations, monitoring, and performance analysis.`;
      
      case 'general_assistance':
      default:
        return `[CONTEXT: General Assistance Mode] Provide helpful guidance and assist with navigation between different modes.`;
    }
  }

  private generateContextAwareFallbackResponse(message: string, context?: AppContext): string {
    const lowerMessage = message.toLowerCase();
    
    switch (context?.mode) {
      case 'infrastructure_management':
        if (lowerMessage.includes('add') || lowerMessage.includes('create')) {
          return `In Infrastructure Management mode, I can help you add components like servers, databases, load balancers, and APIs. Try saying "add a web server" or "create a database"`;
        }
        if (lowerMessage.includes('connect') || lowerMessage.includes('link')) {
          return `I can help you connect infrastructure components. Try "connect web server to database" or "link API to load balancer"`;
        }
        return `I'm in Infrastructure Management mode. I can help you add, modify, connect, and analyze infrastructure components. What would you like to work on?`;

      case 'company_management':
        if (lowerMessage.includes('company') || lowerMessage.includes('business')) {
          return `In Company Management mode, I can help you create companies, manage their profiles, and organize their infrastructure. What company-related task can I help with?`;
        }
        return `I'm in Company Management mode. I can help you create and manage companies, their profiles, and organize their infrastructure. What would you like to do?`;

      case 'api_management':
        return `I'm in API Management mode. I can help you design APIs, create endpoints, and manage integrations. What API-related task are you working on?`;

      case 'simulation_control':
        return `I'm in Simulation Control mode. I can help you start, stop, monitor, and analyze simulations. What simulation operation would you like to perform?`;

      case 'general_assistance':
      default:
        return `I'm here to help! I can assist with infrastructure management, company operations, API design, and simulation control. What would you like to work on?`;
    }
  }

  private async gatherCompanyContext(baseContext?: any): Promise<any> {
    const enhancedContext = { ...baseContext };

    try {
      // Priority 1: Use currentInfrastructure if available
      if (baseContext?.currentInfrastructure && Array.isArray(baseContext.currentInfrastructure) && baseContext.currentInfrastructure.length > 0) {
        enhancedContext.currentInfrastructureJSON = JSON.stringify(baseContext.currentInfrastructure, null, 2);
        enhancedContext.infrastructure = {
          entities: baseContext.currentInfrastructure,
          totalEntities: baseContext.currentInfrastructure.length,
          entityTypes: [...new Set(baseContext.currentInfrastructure.map((e: any) => e.type))],
          networkSegments: this.analyzeNetworkSegments(baseContext.currentInfrastructure)
        };
        
        return enhancedContext;
      }

      // Priority 2: Try to get company and its infrastructure if we have a company ID
      const companyId = baseContext?.selectedCompany || baseContext?.currentContext?.currentCompanyId || baseContext?.companyId;
      
      if (companyId) {
        try {
          const companies = await this.makeApiCall('getAllCompanies', {});
          const company = companies.companies?.find((c: any) => c.id === companyId);
          
          if (company) {
            enhancedContext.company = {
              id: company.id,
              name: company.name,
              description: company.description,
              industry: company.metadata?.industry,
              services: company.services || [],
              sectorTags: company.sectorTags || []
            };

            // Fetch infrastructure from API
            try {
              const infraResult = await this.makeApiCall('getCompanyInfrastructure', {
                companyId: companyId
              });
              
              if (infraResult.infrastructure && Array.isArray(infraResult.infrastructure) && infraResult.infrastructure.length > 0) {
                enhancedContext.currentInfrastructureJSON = JSON.stringify(infraResult.infrastructure, null, 2);
                enhancedContext.infrastructure = {
                  entities: infraResult.infrastructure,
                  totalEntities: infraResult.infrastructure.length,
                  entityTypes: [...new Set(infraResult.infrastructure.map((e: any) => e.type))],
                  networkSegments: this.analyzeNetworkSegments(infraResult.infrastructure)
                };
              }
            } catch (infraError) {
              console.error('Failed to fetch infrastructure details:', infraError);
            }
          }
        } catch (companyError) {
          console.error('Failed to fetch company details:', companyError);
        }
      }

      // Ensure we always have an infrastructure object
      if (!enhancedContext.infrastructure) {
        enhancedContext.infrastructure = {
          entities: [],
          totalEntities: 0,
          entityTypes: [],
          networkSegments: { segments: [], isolation: 'none' }
        };
      }

      enhancedContext.contextMode = baseContext?.contextMode || 'general_assistance';
      enhancedContext.contextGatheredAt = new Date().toISOString();

      return enhancedContext;
      
    } catch (error) {
      console.error('Error in context-aware gathering:', error);
      return {
        ...baseContext,
        infrastructure: {
          entities: [],
          totalEntities: 0,
          entityTypes: [],
          networkSegments: { segments: [], isolation: 'none' }
        },
        contextMode: baseContext?.contextMode || 'general_assistance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private calculateLayoutPosition(layoutInstructions?: string): { x: number; y: number } {
    let position = { 
      x: 200 + Math.random() * 400, 
      y: 200 + Math.random() * 300 
    };

    if (!layoutInstructions) {
      return position;
    }

    const instructions = layoutInstructions.toLowerCase();
    
    if (instructions.includes('left')) {
      position.x = 100 + Math.random() * 200;
    } else if (instructions.includes('right')) {
      position.x = 500 + Math.random() * 200;
    } else if (instructions.includes('center')) {
      position.x = 350 + Math.random() * 100;
    }

    if (instructions.includes('top')) {
      position.y = 100 + Math.random() * 150;
    } else if (instructions.includes('bottom')) {
      position.y = 400 + Math.random() * 150;
    } else if (instructions.includes('middle')) {
      position.y = 250 + Math.random() * 100;
    }

    return position;
  }

  private analyzeNetworkSegments(entities: any[]): any {
    return {
      segments: entities.length > 0 ? ['main'] : [],
      isolation: 'basic'
    };
  }

  private generateSectorTags(industry: string, userTags: string[]): string[] {
    const industryTagMap: Record<string, string[]> = {
      banking: ['🏦 Banking', '💰 Financial Services'],
      fintech: ['💳 FinTech', '💳 Payments', '💰 Financial Technology'],
      tech: ['💻 Technology', '🚀 Innovation'],
      healthcare: ['🏥 Healthcare', '⚕️ Medical'],
      logistics: ['🚚 Logistics', '📦 Supply Chain'],
      defense: ['🛡️ Defense', '🔒 Security'],
      retail: ['🛒 Retail', '🛍️ E-commerce'],
      energy: ['⚡ Energy', '🌱 Renewable'],
      manufacturing: ['🏭 Manufacturing', '⚙️ Industry 4.0'],
      telecom: ['📡 Telecom', '📶 Communications'],
      public: ['🏛️ Government', '👥 Public Services']
    };

    const baseTags = industryTagMap[industry] || ['🏢 Business'];
    
    const enhancedUserTags = userTags.map(tag => {
      if (tag.match(/[\u1F000-\u1F9FF\u2600-\u26FF\u2700-\u27BF]/)) {
        return tag;
      }
      
      const tagLower = tag.toLowerCase();
      if (tagLower.includes('ai')) return '🤖 ' + tag;
      if (tagLower.includes('cloud')) return '☁️ ' + tag;
      if (tagLower.includes('mobile')) return '📱 ' + tag;
      if (tagLower.includes('blockchain')) return '🔗 ' + tag;
      if (tagLower.includes('iot')) return '🌐 ' + tag;
      
      return tag;
    });

    return [...baseTags, ...enhancedUserTags];
  }

  private mapStringToEntityType(typeString: string): EntityType {
    const mapping: Record<string, EntityType> = {
      'web_app': EntityType.WEB_APP,
      'database': EntityType.DATABASE,
      'api_service': EntityType.API_SERVICE,
      'load_balancer': EntityType.LOAD_BALANCER,
      'firewall': EntityType.FIREWALL,
      'dns_server': EntityType.DNS_SERVER,
      'ntp_server': EntityType.NTP_SERVER
    };
    return mapping[typeString] || EntityType.WEB_APP;
  }
}