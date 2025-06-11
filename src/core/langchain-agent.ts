import { DynamicStructuredTool, Tool } from '@langchain/core/tools';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { z } from 'zod';
import { LangChainOrchestrator } from './langchain-orchestrator';
import { VectorMemoryManager } from './vector-memory-manager';
import { CompanyMemoryRecord, InfrastructureEntity, EntityType, FidelityLevel } from '../types/infrastructure';
import { v4 as uuidv4 } from 'uuid';

// Zod schemas for tool parameters
const CreateCompanySchema = z.object({
  name: z.string().describe('Company name'),
  description: z.string().describe('Company business description'),
  industry: z.enum(['banking', 'fintech', 'tech', 'healthcare', 'logistics', 'defense', 'retail', 'energy', 'manufacturing', 'telecom', 'public']).describe('Industry sector'),
  services: z.array(z.string()).describe('List of company services'),
  employees: z.number().optional().describe('Number of employees'),
  founded: z.number().optional().describe('Year founded'),
  headquarters: z.string().optional().describe('Headquarters location')
});

const SearchCompaniesSchema = z.object({
  query: z.string().describe('Natural language search query'),
  limit: z.number().optional().default(10).describe('Maximum number of results')
});

const AddInfrastructureSchema = z.object({
  companyId: z.string().describe('Company ID to add infrastructure to'),
  entityType: z.enum(['web_app', 'database', 'firewall', 'load_balancer', 'dns_server', 'ntp_server', 'api_service']).describe('Type of infrastructure component'),
  name: z.string().describe('Component name'),
  hostname: z.string().optional().describe('Hostname for the component'),
  ports: z.array(z.object({
    number: z.number(),
    protocol: z.enum(['tcp', 'udp']),
    service: z.string(),
    status: z.enum(['open', 'closed', 'filtered']).default('open')
  })).optional().describe('Network ports configuration')
});

const ParseInfrastructureSchema = z.object({
  description: z.string().describe('Natural language description of infrastructure to parse')
});

const ChatSchema = z.object({
  message: z.string().describe('User message for conversation'),
  context: z.record(z.any()).optional().describe('Optional conversation context')
});

/**
 * LangChain Agent-based Infrastructure Assistant
 * Uses native LangChain function calling with DynamicStructuredTool
 */
export class LangChainInfrastructureAgent {
  private orchestrator: LangChainOrchestrator;
  private vectorMemory: VectorMemoryManager;
  private tools: DynamicStructuredTool[];
  private llm: ChatOllama | ChatOpenAI | ChatAnthropic;
  private agent: any;

  constructor(config: {
    provider: 'ollama' | 'openai' | 'anthropic';
    modelName: string;
    ollamaBaseUrl?: string;
    apiKey?: string;
    temperature?: number;
  }) {
    console.log('🚀 Initializing LangChain Infrastructure Agent...', {
      provider: config.provider,
      model: config.modelName,
      timestamp: new Date().toISOString()
    });

    this.orchestrator = new LangChainOrchestrator(config.ollamaBaseUrl);
    this.vectorMemory = VectorMemoryManager.getInstance(config.ollamaBaseUrl);
    
    // Initialize LLM based on provider
    this.llm = this.initializeLLM(config);
    
    // Create tools using DynamicStructuredTool
    this.tools = this.createTools();
  }

  private initializeLLM(config: any) {
    switch (config.provider) {
      case 'openai':
        return new ChatOpenAI({
          modelName: config.modelName,
          openAIApiKey: config.apiKey,
          temperature: config.temperature || 0.1,
        });
      
      case 'anthropic':
        return new ChatAnthropic({
          modelName: config.modelName,
          anthropicApiKey: config.apiKey,
          temperature: config.temperature || 0.1,
        });
      
      case 'ollama':
      default:
        return new ChatOllama({
          baseUrl: config.ollamaBaseUrl || 'http://localhost:11434',
          model: config.modelName,
          temperature: config.temperature || 0.1,
        });
    }
  }

  /**
   * Initialize the agent executor with tools
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🔧 Creating agent executor with tools...', {
        toolCount: this.tools.length,
        tools: this.tools.map(t => t.name)
      });

      // For now, we'll create a simple executor without the agent framework
      // to avoid TypeScript compatibility issues with the current LangChain version
      this.agent = {
        call: async (input: { input: string; chat_history: any[] }) => {
          // Simple tool routing based on input keywords
          const result = await this.executeSimpleAgent(input.input);
          return {
            output: result.output,
            intermediateSteps: result.intermediateSteps || []
          };
        }
      };

      console.log('✅ LangChain Infrastructure Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize agent:', error);
      throw error;
    }
  }

  /**
   * Simple agent implementation that routes to appropriate tools
   */
  private async executeSimpleAgent(input: string): Promise<{
    output: string;
    intermediateSteps?: any[];
  }> {
    const lowerInput = input.toLowerCase();
    
    try {
      // Route to appropriate tool based on keywords
      if (lowerInput.includes('create') && (lowerInput.includes('company') || lowerInput.includes('organization'))) {
        return await this.handleCreateCompany(input);
      } else if (lowerInput.includes('search') && lowerInput.includes('compan')) {
        return await this.handleSearchCompanies(input);
      } else if (lowerInput.includes('parse') && lowerInput.includes('infrastructure')) {
        return await this.handleParseInfrastructure(input);
      } else if (lowerInput.includes('add') && lowerInput.includes('infrastructure')) {
        return await this.handleAddInfrastructure(input);
      } else {
        // Default to chat for general questions
        return await this.handleChat(input);
      }
    } catch (error) {
      return {
        output: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your request.`
      };
    }
  }

  // Tool handler methods
  private async handleCreateCompany(input: string): Promise<{ output: string; intermediateSteps?: any[] }> {
    // Extract company details from input using simple parsing
    const name = this.extractCompanyName(input);
    const industry = this.extractIndustry(input);
    const description = this.extractDescription(input);
    
    const createTool = this.tools.find(t => t.name === 'create_company');
    if (createTool) {
      const result = await createTool.func({
        name,
        description,
        industry,
        services: [industry.charAt(0).toUpperCase() + industry.slice(1) + ' Services', 'Customer Support', 'Operations']
      });
      
      return {
        output: `Created company: ${result}`,
        intermediateSteps: [{ action: { tool: 'create_company' }, observation: result }]
      };
    }
    
    return { output: "I couldn't find the create company tool." };
  }

  private async handleSearchCompanies(input: string): Promise<{ output: string; intermediateSteps?: any[] }> {
    const query = input.replace(/search|find|look for|companies|company/gi, '').trim();
    
    const searchTool = this.tools.find(t => t.name === 'search_companies');
    if (searchTool) {
      const result = await searchTool.func({ query: query || 'companies', limit: 5 });
      
      return {
        output: `Search results: ${result}`,
        intermediateSteps: [{ action: { tool: 'search_companies' }, observation: result }]
      };
    }
    
    return { output: "I couldn't find the search companies tool." };
  }

  private async handleParseInfrastructure(input: string): Promise<{ output: string; intermediateSteps?: any[] }> {
    const description = input.replace(/parse|infrastructure|description/gi, '').trim();
    
    const parseTool = this.tools.find(t => t.name === 'parse_infrastructure');
    if (parseTool) {
      const result = await parseTool.func({ description });
      
      return {
        output: `Parsed infrastructure: ${result}`,
        intermediateSteps: [{ action: { tool: 'parse_infrastructure' }, observation: result }]
      };
    }
    
    return { output: "I couldn't find the parse infrastructure tool." };
  }

  private async handleAddInfrastructure(input: string): Promise<{ output: string; intermediateSteps?: any[] }> {
    return { output: "Add infrastructure functionality requires a company ID. Please provide more specific details." };
  }

  private async handleChat(input: string): Promise<{ output: string; intermediateSteps?: any[] }> {
    const chatTool = this.tools.find(t => t.name === 'chat');
    if (chatTool) {
      const result = await chatTool.func({ message: input });
      
      return {
        output: JSON.parse(result).message,
        intermediateSteps: [{ action: { tool: 'chat' }, observation: result }]
      };
    }
    
    return { output: "I'm here to help with infrastructure questions. What would you like to know?" };
  }

  // Simple extraction methods
  private extractCompanyName(input: string): string {
    const matches = input.match(/company called ([^,\s]+(?:\s+[^,\s]+)*)/i) || 
                   input.match(/called ([^,\s]+(?:\s+[^,\s]+)*)/i) ||
                   input.match(/named ([^,\s]+(?:\s+[^,\s]+)*)/i);
    return matches ? matches[1].trim() : 'New Company';
  }

  private extractIndustry(input: string): 'banking' | 'fintech' | 'tech' | 'healthcare' | 'logistics' | 'defense' | 'retail' | 'energy' | 'manufacturing' | 'telecom' | 'public' {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('bank') || lowerInput.includes('financial')) return 'banking';
    if (lowerInput.includes('fintech') || lowerInput.includes('payment')) return 'fintech';
    if (lowerInput.includes('health') || lowerInput.includes('medical')) return 'healthcare';
    if (lowerInput.includes('logistic') || lowerInput.includes('supply')) return 'logistics';
    if (lowerInput.includes('defense') || lowerInput.includes('security')) return 'defense';
    if (lowerInput.includes('retail') || lowerInput.includes('commerce')) return 'retail';
    if (lowerInput.includes('energy') || lowerInput.includes('power')) return 'energy';
    if (lowerInput.includes('manufacturing') || lowerInput.includes('factory')) return 'manufacturing';
    if (lowerInput.includes('telecom') || lowerInput.includes('communication')) return 'telecom';
    if (lowerInput.includes('public') || lowerInput.includes('government')) return 'public';
    
    return 'tech'; // default
  }

  private extractDescription(input: string): string {
    // Remove command words and extract description
    const cleaned = input
      .replace(/create|build|make|company|called|named/gi, '')
      .replace(/that provides?|specializing in|focused on/gi, 'providing')
      .trim();
    
    return cleaned || 'A professional organization providing quality services.';
  }

  /**
   * Execute a natural language command using the agent
   */
  public async executeCommand(input: string): Promise<{
    output: string;
    intermediateSteps?: any[];
    error?: string;
  }> {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    console.log('🎯 Executing agent command', {
      requestId,
      input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

    try {
      if (!this.agent) {
        await this.initialize();
      }

      const result = await this.agent.call({
        input,
        chat_history: []
      });

      const duration = Date.now() - startTime;
      
      // Log the agent interaction
      this.logAgentInteraction(
        `${this.llm.constructor.name} Agent`,
        this.getProviderName(),
        input,
        result.output,
        duration,
        undefined,
        {
          requestId,
          intermediateSteps: result.intermediateSteps?.length || 0,
          toolsUsed: this.extractToolsUsed(result.intermediateSteps)
        }
      );
      
      console.log('✅ Agent command completed', {
        requestId,
        duration: `${duration}ms`,
        hasIntermediateSteps: !!result.intermediateSteps?.length,
        timestamp: new Date().toISOString()
      });

      return {
        output: result.output,
        intermediateSteps: result.intermediateSteps
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log the failed agent attempt
      this.logAgentInteraction(
        `${this.llm.constructor.name} Agent`,
        this.getProviderName(),
        input,
        '',
        duration,
        errorMessage,
        { requestId, failed: true }
      );
      
      console.error('❌ Agent command failed', {
        requestId,
        error: errorMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      return {
        output: `I encountered an error: ${errorMessage}. Please try rephrasing your request.`,
        error: errorMessage
      };
    }
  }

  /**
   * Log agent interaction to the global store (browser-only)
   */
  private logAgentInteraction(
    modelName: string,
    provider: string,
    prompt: string,
    response: string,
    duration?: number,
    error?: string,
    metadata?: Record<string, any>
  ) {
    // Only log in browser environment
    if (typeof window !== 'undefined') {
      try {
        // Import the store dynamically to avoid SSR issues
        const { useAppStore } = require('../store/app-store');
        const { addLog } = useAppStore.getState();
        
        addLog({
          modelName,
          provider,
          prompt: prompt.substring(0, 2000), // Limit prompt length for UI
          response: response.substring(0, 2000), // Limit response length for UI
          type: 'agent',
          duration,
          error,
          metadata
        });
      } catch (err) {
        console.warn('Failed to log agent interaction:', err);
      }
    }
  }

  /**
   * Get provider name for logging
   */
  private getProviderName(): string {
    if (this.llm instanceof require('@langchain/community/chat_models/ollama').ChatOllama) {
      return 'ollama';
    } else if (this.llm.constructor.name.includes('OpenAI')) {
      return 'openai';
    } else if (this.llm.constructor.name.includes('Anthropic')) {
      return 'anthropic';
    }
    return 'unknown';
  }

  /**
   * Extract tools used from intermediate steps for logging
   */
  private extractToolsUsed(intermediateSteps?: any[]): string[] {
    if (!intermediateSteps) return [];
    
    return intermediateSteps
      .filter(step => step.action?.tool)
      .map(step => step.action.tool)
      .filter((tool, index, arr) => arr.indexOf(tool) === index); // Remove duplicates
  }

  /**
   * Create DynamicStructuredTool instances for all infrastructure operations
   */
  private createTools(): DynamicStructuredTool[] {
    return [
      // Company Management Tools
      new DynamicStructuredTool({
        name: 'create_company',
        description: 'Create a new company with infrastructure simulation capabilities',
        schema: CreateCompanySchema,
        func: async (params) => {
          try {
            const companyRecord: Omit<CompanyMemoryRecord, 'id' | 'createdAt' | 'updatedAt'> = {
              name: params.name,
              description: params.description,
              sectorTags: this.generateSectorTags(params.industry),
              services: params.services,
              metadata: {
                industry: params.industry,
                employees: params.employees || 100,
                founded: params.founded || new Date().getFullYear(),
                headquarters: params.headquarters || 'Unknown',
                source: 'agent_creation'
              }
            };

            const companyId = await this.orchestrator.addCompanyToMemory(companyRecord);
            const rootEntity = await this.orchestrator.createRootOrganizationWithMemory(params.description);

            return JSON.stringify({
              success: true,
              message: `Successfully created company '${params.name}' with ID ${companyId}`,
              data: {
                companyId,
                company: { ...companyRecord, id: companyId },
                rootEntity
              }
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }),

      new DynamicStructuredTool({
        name: 'search_companies',
        description: 'Search for companies in the vector database using natural language',
        schema: SearchCompaniesSchema,
        func: async (params) => {
          try {
            const results = await this.orchestrator.searchCompaniesInMemory(params.query, params.limit);
            
            return JSON.stringify({
              success: true,
              message: `Found ${results.length} companies matching your search`,
              data: {
                companies: results.map(r => ({
                  id: r.record.id,
                  name: r.record.name,
                  description: r.record.description,
                  industry: r.record.metadata?.industry,
                  similarity: Math.round(r.similarity * 100)
                })),
                totalResults: results.length
              }
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }),

      // Infrastructure Management Tools
      new DynamicStructuredTool({
        name: 'add_infrastructure',
        description: 'Add a new infrastructure component to a company',
        schema: AddInfrastructureSchema,
        func: async (params) => {
          try {
            const entity: Partial<InfrastructureEntity> = {
              id: uuidv4(),
              type: this.mapStringToEntityType(params.entityType),
              name: params.name,
              hostname: params.hostname || `${params.name.toLowerCase().replace(/\s+/g, '')}.company.local`,
              ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
              fidelity: FidelityLevel.VIRTUAL,
              ports: params.ports || this.getDefaultPorts(params.entityType),
              metadata: {
                description: `${params.entityType.replace('_', ' ')} component`,
                createdBy: 'agent'
              },
              position: { x: Math.random() * 800, y: Math.random() * 600 },
              connections: [],
              logs: []
            };

            const entityId = await this.orchestrator.addInfrastructureToCompany(
              params.companyId, 
              entity as InfrastructureEntity
            );

            return JSON.stringify({
              success: true,
              message: `Added ${params.entityType} '${params.name}' to company infrastructure`,
              data: {
                entityId,
                entity: {
                  ...entity,
                  id: entityId
                }
              }
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }),

      new DynamicStructuredTool({
        name: 'parse_infrastructure',
        description: 'Parse a natural language description into infrastructure components',
        schema: ParseInfrastructureSchema,
        func: async (params) => {
          try {
            const parsed = await this.orchestrator.parseInfrastructureDescription(params.description);
            
            return JSON.stringify({
              success: true,
              message: `Parsed infrastructure with ${parsed.entities.length} components and ${parsed.connections.length} connections`,
              data: {
                entities: parsed.entities.map(e => ({
                  name: e.name,
                  type: e.type,
                  hostname: e.hostname,
                  ports: e.ports?.length || 0
                })),
                connections: parsed.connections,
                entitiesCount: parsed.entities.length,
                connectionsCount: parsed.connections.length
              }
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }),

      // Conversational Tool
      new DynamicStructuredTool({
        name: 'chat',
        description: 'Have a conversation about infrastructure topics',
        schema: ChatSchema,
        func: async (params) => {
          try {
            const response = await this.orchestrator.generateChatResponse(params.message, params.context);
            
            return JSON.stringify({
              success: true,
              message: response,
              data: {
                conversationType: 'infrastructure_chat',
                context: params.context || {}
              }
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }),

      // Information Retrieval Tools
      new DynamicStructuredTool({
        name: 'get_company_infrastructure',
        description: 'Get all infrastructure components for a specific company',
        schema: z.object({
          companyId: z.string().describe('Company ID to get infrastructure for')
        }),
        func: async (params) => {
          try {
            const infrastructure = await this.orchestrator.getCompanyInfrastructure(params.companyId);
            
            return JSON.stringify({
              success: true,
              message: `Found ${infrastructure.length} infrastructure components`,
              data: {
                infrastructure: infrastructure.map(e => ({
                  id: e.id,
                  name: e.name,
                  type: e.type,
                  hostname: e.hostname,
                  ip: e.ip,
                  ports: e.ports.length,
                  connections: e.connections.length
                })),
                totalComponents: infrastructure.length
              }
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }),

      new DynamicStructuredTool({
        name: 'describe_infrastructure_layout',
        description: 'Generate a detailed description of a company\'s infrastructure layout',
        schema: z.object({
          companyId: z.string().describe('Company ID to describe infrastructure for')
        }),
        func: async (params) => {
          try {
            const layout = await this.orchestrator.describeInfrastructureLayout(params.companyId);
            
            return JSON.stringify({
              success: true,
              message: 'Generated infrastructure layout description',
              data: {
                layout,
                generatedAt: new Date().toISOString()
              }
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      })
    ];
  }

  /**
   * Get available tools information for help/documentation
   */
  public getAvailableTools(): Array<{
    name: string;
    description: string;
    parameters: any;
  }> {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.schema
    }));
  }

  // Helper methods
  private generateSectorTags(industry: string): string[] {
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

    return industryTagMap[industry] || ['🏢 Business'];
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

  private getDefaultPorts(entityType: string): Array<{
    number: number;
    protocol: 'tcp' | 'udp';
    service: string;
    status: 'open' | 'closed' | 'filtered';
  }> {
    const portMappings: Record<string, any[]> = {
      'web_app': [{ number: 80, protocol: 'tcp', service: 'http', status: 'open' }],
      'database': [{ number: 5432, protocol: 'tcp', service: 'postgresql', status: 'open' }],
      'api_service': [{ number: 443, protocol: 'tcp', service: 'https', status: 'open' }],
      'load_balancer': [{ number: 80, protocol: 'tcp', service: 'http', status: 'open' }],
      'firewall': [{ number: 22, protocol: 'tcp', service: 'ssh', status: 'open' }],
      'dns_server': [{ number: 53, protocol: 'udp', service: 'dns', status: 'open' }],
      'ntp_server': [{ number: 123, protocol: 'udp', service: 'ntp', status: 'open' }]
    };

    return portMappings[entityType] || [{ number: 80, protocol: 'tcp', service: 'http', status: 'open' }];
  }
}