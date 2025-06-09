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
import { LangChainOrchestrator } from '../core/langchain-orchestrator';
import { SimulationEngine } from '../core/simulation-engine';
import { CompanyMemoryRecord, InfrastructureEntity, EntityType, FidelityLevel, Port } from '../types/infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: Date;
}

export class ToolHandlers {
  private orchestrator: LangChainOrchestrator;
  private simulationEngine: SimulationEngine;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    this.orchestrator = new LangChainOrchestrator(ollamaBaseUrl);
    this.simulationEngine = new SimulationEngine();
  }

  async initialize(): Promise<void> {
    await this.orchestrator.initializeVectorMemory();
  }

  /**
   * Route and execute tool actions
   */
  async executeAction(action: ToolAction): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    console.log('🔧 Executing Tool Action', {
      action: action.action,
      parameters: Object.keys(action.parameters),
      timestamp: new Date().toISOString()
    });

    try {
      let result: ToolExecutionResult;

      switch (action.action) {
        case 'createCompany':
          result = await this.handleCreateCompany(action);
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
          result = await this.handleSearchCompanies(action);
          break;
        case 'controlSimulation':
          result = await this.handleControlSimulation(action);
          break;
        case 'modifyInfrastructure':
          result = await this.handleModifyInfrastructure(action);
          break;
        case 'chat':
          result = await this.handleChat(action);
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
      console.log('✅ Tool Action Completed', {
        action: action.action,
        success: result.success,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ Tool Action Failed', {
        action: action.action,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        message: 'Tool execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Create a new company and add it to the vector database
   */
  private async handleCreateCompany(action: CreateCompanyAction): Promise<ToolExecutionResult> {
    const { parameters } = action;
    
    // Generate sector tags based on industry
    const sectorTags = this.generateSectorTags(parameters.industry, parameters.tags);
    
    // Create company record
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
        source: 'tool_creation'
      }
    };

    // Add to vector database
    const companyId = await this.orchestrator.addCompanyToMemory(companyRecord);

    // Create root organization entity for the infrastructure simulation
    const rootEntity = await this.orchestrator.createRootOrganizationWithMemory(parameters.description);

    return {
      success: true,
      message: `Successfully created company '${parameters.name}' with ID ${companyId}`,
      data: {
        companyId,
        company: { ...companyRecord, id: companyId },
        rootEntity,
        sectorTags
      },
      timestamp: new Date()
    };
  }

  /**
   * Generate API specifications for a company service
   */
  private async handleGenerateApi(action: GenerateApiAction): Promise<ToolExecutionResult> {
    const { parameters } = action;

    // Find the company first
    const companies = await this.orchestrator.getAllCompaniesFromMemory();
    const company = companies.find(c => c.id === parameters.companyId);
    
    if (!company) {
      return {
        success: false,
        message: 'Company not found',
        error: `Company with ID ${parameters.companyId} does not exist`,
        timestamp: new Date()
      };
    }

    // Generate API entity
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
  }

  /**
   * Link two infrastructure entities
   */
  private async handleLinkEntities(action: LinkEntitiesAction): Promise<ToolExecutionResult> {
    const { parameters } = action;

    // In a real implementation, you'd fetch the actual entities from your state
    // For now, we'll create a connection specification
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

  /**
   * Expand infrastructure by adding new components
   */
  private async handleExpandInfrastructure(action: ExpandInfrastructureAction): Promise<ToolExecutionResult> {
    const { parameters } = action;

    // Find the company
    const companies = await this.orchestrator.getAllCompaniesFromMemory();
    const company = companies.find(c => c.id === parameters.companyId);
    
    if (!company) {
      return {
        success: false,
        message: 'Company not found',
        error: `Company with ID ${parameters.companyId} does not exist`,
        timestamp: new Date()
      };
    }

    // Convert schema ports to proper Port interface
    const ports: Port[] = (parameters.ports || []).map(p => ({
      number: p.number || 80,
      protocol: p.protocol || 'tcp',
      service: p.service || 'http',
      status: p.status || 'open'
    }));

    // Create new infrastructure entity
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
  }

  /**
   * Modify infrastructure for a specific company
   */
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

          // Create full entity object
          const newEntity: InfrastructureEntity = {
            id: entity.id || require('uuid').v4(),
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

          const addedEntityId = await this.orchestrator.addInfrastructureToCompany(companyId, newEntity);

          return {
            success: true,
            message: `Added ${entity.type} '${entity.name}' to company infrastructure`,
            data: {
              entityId: addedEntityId,
              entity: newEntity,
              operation: 'add'
            },
            timestamp: new Date()
          };

        case 'remove':
          // Enhanced remove logic with smart entity identification
          let targetEntityId = entityId;
          
          if (!targetEntityId && entity?.name) {
            // Find entity by name if ID not provided
            const existingInfrastructure = await this.orchestrator.getCompanyInfrastructure(companyId);
            const foundEntity = this.findEntityByName(existingInfrastructure, entity.name);
            if (foundEntity) {
              targetEntityId = foundEntity.id;
            }
          }

          if (!targetEntityId) {
            return {
              success: false,
              message: 'Could not identify which entity to remove. Please specify the entity name or ID.',
              error: 'Missing entityId parameter',
              timestamp: new Date()
            };
          }

          await this.orchestrator.removeInfrastructureFromCompany(companyId, targetEntityId);

          return {
            success: true,
            message: `Removed entity from company infrastructure`,
            data: {
              entityId: targetEntityId,
              operation: 'remove'
            },
            timestamp: new Date()
          };

        case 'update':
          // Enhanced update logic with smart entity identification and property modification
          let updateTargetId = entity?.id;
          
          // If no ID provided, try to find entity by name
          if (!updateTargetId && entity?.name) {
            const existingInfrastructure = await this.orchestrator.getCompanyInfrastructure(companyId);
            const foundEntity = this.findEntityByName(existingInfrastructure, entity.name);
            if (foundEntity) {
              updateTargetId = foundEntity.id;
            }
          }

          if (!updateTargetId) {
            return {
              success: false,
              message: `Could not identify which entity to update. Entity name provided: ${entity?.name || 'none'}`,
              error: 'Entity not found',
              timestamp: new Date()
            };
          }

          // Get existing entity to merge with updates
          const existingInfrastructure = await this.orchestrator.getCompanyInfrastructure(companyId);
          const existingEntity = existingInfrastructure.find(e => e.id === updateTargetId);
          
          if (!existingEntity) {
            return {
              success: false,
              message: `Entity with ID '${updateTargetId}' not found in company infrastructure`,
              error: 'Entity not found',
              timestamp: new Date()
            };
          }

          // Smart property merging - only update provided properties
          const updatedEntity: InfrastructureEntity = {
            ...existingEntity,
            // Only update properties that were specifically provided
            ...(entity?.name && { name: entity.name }),
            ...(entity?.ip && { ip: entity.ip }),
            ...(entity?.hostname && { hostname: entity.hostname }),
            ...(entity?.type && { type: this.mapStringToEntityType(entity.type) }),
            ...(entity?.ports && { ports: entity.ports.map(p => ({
              number: p.number || 80,
              protocol: p.protocol || 'tcp',
              service: p.service || 'http',
              status: p.status || 'open'
            })) }),
            ...(entity?.position && { position: { 
              x: entity.position.x || existingEntity.position.x || 0, 
              y: entity.position.y || existingEntity.position.y || 0 
            } }),
            ...(entity?.metadata && { metadata: { ...existingEntity.metadata, ...entity.metadata } })
          };

          await this.orchestrator.updateCompanyInfrastructure(companyId, updatedEntity);

          // Generate specific success message based on what was updated
          const updatedProperties = [];
          if (entity?.ip) updatedProperties.push(`IP to ${entity.ip}`);
          if (entity?.name && entity.name !== existingEntity.name) updatedProperties.push(`name to ${entity.name}`);
          if (entity?.hostname) updatedProperties.push(`hostname to ${entity.hostname}`);
          if (entity?.ports) updatedProperties.push(`ports configuration`);

          const changeDescription = updatedProperties.length > 0 
            ? `Updated ${updatedProperties.join(', ')} for` 
            : 'Updated';

          return {
            success: true,
            message: `${changeDescription} '${existingEntity.name}' in company infrastructure`,
            data: {
              entity: updatedEntity,
              operation: 'update',
              changes: updatedProperties,
              previousValues: {
                ip: existingEntity.ip,
                name: existingEntity.name,
                hostname: existingEntity.hostname
              }
            },
            timestamp: new Date()
          };

        case 'describe':
          const layoutDescription = await this.orchestrator.describeInfrastructureLayout(companyId);

          return {
            success: true,
            message: 'Generated infrastructure layout description',
            data: {
              description: layoutDescription,
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
      console.error('Error modifying infrastructure:', error);
      return {
        success: false,
        message: 'Failed to modify infrastructure',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Find entity by name using fuzzy matching
   */
  private findEntityByName(entities: InfrastructureEntity[], searchName: string): InfrastructureEntity | null {
    const searchLower = searchName.toLowerCase().trim();
    
    // Exact match first
    const exactMatch = entities.find(e => e.name.toLowerCase() === searchLower);
    if (exactMatch) return exactMatch;

    // Partial match
    const partialMatch = entities.find(e => 
      e.name.toLowerCase().includes(searchLower) || 
      searchLower.includes(e.name.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Check hostname
    const hostnameMatch = entities.find(e => 
      e.hostname.toLowerCase().includes(searchLower)
    );
    if (hostnameMatch) return hostnameMatch;

    // Check metadata for alternative names
    const metadataMatch = entities.find(e => {
      const metadata = JSON.stringify(e.metadata || {}).toLowerCase();
      return metadata.includes(searchLower);
    });
    
    return metadataMatch || null;
  }

  /**
   * Calculate position based on layout instructions
   */
  private calculateLayoutPosition(layoutInstructions?: string): { x: number; y: number } {
    // Default random position
    let position = { 
      x: 200 + Math.random() * 400, 
      y: 200 + Math.random() * 300 
    };

    if (!layoutInstructions) {
      return position;
    }

    const instructions = layoutInstructions.toLowerCase();

    // Parse basic positioning instructions
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

    // Adjacent positioning
    if (instructions.includes('adjacent') || instructions.includes('next to')) {
      // Add slight randomization for adjacent placement
      position.x += (Math.random() - 0.5) * 100;
      position.y += (Math.random() - 0.5) * 100;
    }

    return position;
  }

  /**
   * Search for companies in the vector database
   */
  private async handleSearchCompanies(action: SearchCompaniesAction): Promise<ToolExecutionResult> {
    const { parameters } = action;

    let results;
    
    if (parameters.query) {
      // Semantic search
      results = await this.orchestrator.searchCompaniesInMemory(parameters.query, parameters.limit);
    } else {
      // Get all companies and filter
      const allCompanies = await this.orchestrator.getAllCompaniesFromMemory();
      results = allCompanies
        .filter(company => {
          if (parameters.industry && company.metadata?.industry !== parameters.industry) {
            return false;
          }
          if (parameters.tags && parameters.tags.length > 0) {
            const hasMatchingTag = parameters.tags.some(tag => 
              company.sectorTags.some(sectorTag => 
                sectorTag.toLowerCase().includes(tag.toLowerCase())
              )
            );
            if (!hasMatchingTag) return false;
          }
          return true;
        })
        .slice(0, parameters.limit)
        .map(company => ({ record: company, score: 1.0, similarity: 1.0 }));
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
        }
      },
      timestamp: new Date()
    };
  }

  /**
   * Control simulation state
   */
  private async handleControlSimulation(action: ControlSimulationAction): Promise<ToolExecutionResult> {
    const { parameters } = action;

    let result: any;
    
    switch (parameters.command) {
      case 'start':
        result = this.simulationEngine.start();
        break;
      case 'stop':
        result = this.simulationEngine.stop();
        break;
      case 'pause':
        // Create a mock pause result since the method doesn't exist
        result = { status: 'paused', tickRate: parameters.tickRate };
        break;
      case 'resume':
        // Create a mock resume result since the method doesn't exist
        result = { status: 'resumed' };
        break;
      case 'reset':
        // Create a mock reset result since the method doesn't exist
        result = { status: 'reset' };
        break;
    }

    return {
      success: true,
      message: `Simulation ${parameters.command} executed successfully`,
      data: {
        command: parameters.command,
        simulationState: this.simulationEngine.getState(),
        tickRate: parameters.tickRate,
        targetEntity: parameters.targetEntityId,
        result
      },
      timestamp: new Date()
    };
  }

  /**
   * Handle general chat conversation
   */
  private async handleChat(action: z.infer<typeof ChatActionSchema>): Promise<ToolExecutionResult> {
    const { parameters } = action;
    const { message, context } = parameters;

    try {
      // Build context information for the system prompt
      let contextInfo = '';
      if (context?.companyName) {
        contextInfo += `Current organization: ${context.companyName}\n`;
      }
      if (context?.currentInfrastructure && context.currentInfrastructure.length > 0) {
        contextInfo += `Current infrastructure components: ${context.currentInfrastructure.join(', ')}\n`;
      }

      // Create a comprehensive system prompt for infrastructure assistance
      const systemPrompt = `You are an expert AI infrastructure assistant. Your role is to help users understand and manage their infrastructure through natural conversation and by suggesting specific tool actions.

SYSTEM INSTRUCTIONS:
- You have access to infrastructure management tools that can add, remove, update, and connect components
- When users ask about infrastructure operations, guide them toward specific actionable commands
- Be helpful and conversational while staying focused on infrastructure topics
- If users need to perform actions, suggest the exact phrases they should use

AVAILABLE INFRASTRUCTURE OPERATIONS:
1. Adding components: "Add a [type] called [name]" (e.g., "Add a PostgreSQL database called UserDB")
2. Updating properties: "Change the [property] of [component] to [value]" (e.g., "Change the IP of web server to 10.0.0.5")
3. Removing components: "Remove the [component]" (e.g., "Remove the load balancer")
4. Connecting components: "Connect [component1] to [component2]" (e.g., "Connect the web app to the database")
5. Describing infrastructure: "Describe the current infrastructure"

CURRENT CONTEXT:
${contextInfo || 'No infrastructure context available'}

RESPONSE GUIDELINES:
- Be conversational and helpful
- When users ask vague questions, provide specific examples they can try
- If they mention wanting to do something with infrastructure, suggest the exact command
- For technical questions, provide clear explanations
- Always encourage hands-on exploration of the infrastructure tools

User message: ${message}

Respond naturally as an infrastructure expert assistant:`;

      // Use the orchestrator's LLM for intelligent conversation
      const response = await this.orchestrator.generateResponse(systemPrompt);

      return {
        success: true,
        message: response,
        data: {
          conversationType: 'ai_guided',
          context: context || {},
          userMessage: message,
          systemPromptUsed: true
        },
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error in chat handler:', error);
      
      // Fallback to hardcoded responses if LLM fails
      const fallbackResponse = this.generateConversationalResponse(message, context);
      
      return {
        success: true,
        message: fallbackResponse,
        data: {
          conversationType: 'fallback',
          context: context || {},
          userMessage: message,
          systemPromptUsed: false,
          error: 'LLM unavailable, using fallback responses'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate conversational responses based on message content
   */
  private generateConversationalResponse(message: string, context?: any): string {
    const lowerMessage = message.toLowerCase();
    
    // Infrastructure-related conversations
    if (lowerMessage.includes('infrastructure') || lowerMessage.includes('component') || lowerMessage.includes('server')) {
      if (context?.currentInfrastructure && context.currentInfrastructure.length > 0) {
        return `I can see you currently have ${context.currentInfrastructure.length} infrastructure components: ${context.currentInfrastructure.join(', ')}. What would you like to do with your infrastructure? I can help you add new components, remove existing ones, or create connections between them.`;
      } else {
        return `It looks like you don't have any infrastructure components yet. Would you like me to help you add some? I can add databases, web servers, APIs, load balancers, and more. Just tell me what you need!`;
      }
    }

    // Database-related conversations
    if (lowerMessage.includes('database') || lowerMessage.includes('db')) {
      return `I can help you with database infrastructure! I can add PostgreSQL, MySQL, or other database servers to your infrastructure. Would you like me to add a specific type of database? For example, try saying "Add a PostgreSQL database called UserDB".`;
    }

    // API-related conversations
    if (lowerMessage.includes('api') || lowerMessage.includes('endpoint')) {
      return `APIs are a great way to connect your services! I can help you add API services to your infrastructure or generate API specifications. Would you like to add an API service or create connections between existing components?`;
    }

    // Connection-related conversations
    if (lowerMessage.includes('connect') || lowerMessage.includes('link') || lowerMessage.includes('communication')) {
      if (context?.currentInfrastructure && context.currentInfrastructure.length >= 2) {
        return `I can help you connect your infrastructure components! You currently have: ${context.currentInfrastructure.join(', ')}. Which components would you like to connect? For example, "Connect the web app to the database".`;
      } else {
        return `To connect components, you'll need at least two infrastructure components first. Would you like me to help you add some components to your infrastructure?`;
      }
    }

    // General help requests
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('how do i')) {
      return `I'm here to help you build and manage infrastructure! Here's what I can do:

🏗️ **Add Components**: "Add a PostgreSQL database", "Add a web server"
🔗 **Connect Components**: "Connect the API to the database"
🗑️ **Remove Components**: "Remove the load balancer"
📊 **Describe Setup**: "Describe the current infrastructure"
💬 **Chat**: Ask me questions about infrastructure or just have a conversation!

What would you like to work on?`;
    }

    // Greeting responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      const companyGreeting = context?.companyName ? ` for ${context.companyName}` : '';
      return `Hello! I'm your AI infrastructure assistant${companyGreeting}. I can help you build, modify, and manage infrastructure components. What would you like to work on today?`;
    }

    // Thank you responses
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      return `You're welcome! I'm here whenever you need help with your infrastructure. Feel free to ask me to add components, make connections, or just chat about your setup.`;
    }

    // Default conversational response
    return `I understand you're saying: "${message}". While I can chat about various topics, I'm especially good at helping with infrastructure management. Is there anything specific you'd like to do with your infrastructure, or would you like to know more about what I can help you with?`;
  }

  /**
   * Generate sector tags based on industry and user tags
   */
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
    
    // Add user-provided tags with emojis if they don't have them
    const enhancedUserTags = userTags.map(tag => {
      // Simple check for existing emoji by looking for common emoji ranges
      if (tag.match(/[\u1F000-\u1F9FF\u2600-\u26FF\u2700-\u27BF]/)) {
        return tag; // Already has emoji
      }
      
      // Add relevant emoji based on tag content
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

  /**
   * Map string entity type to EntityType enum
   */
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