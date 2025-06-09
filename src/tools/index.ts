import { 
  ToolAction,
  CreateCompanyAction,
  GenerateApiAction,
  LinkEntitiesAction,
  ExpandInfrastructureAction,
  SearchCompaniesAction,
  ControlSimulationAction
} from './schema';
import { LangChainOrchestrator } from '../core/langchain-orchestrator';
import { SimulationEngine } from '../core/simulation-engine';
import { CompanyMemoryRecord, InfrastructureEntity, EntityType, FidelityLevel, Port } from '../types/infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface ToolCallResult {
  parseResult: {
    success: boolean;
    action?: ToolAction;
    confidence?: number;
    error?: string;
    fallback?: Partial<ToolAction>;
  };
  executionResult?: ToolExecutionResult;
  totalDuration: number;
  timestamp: Date;
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: Date;
}

/**
 * Main orchestrator for structured tool calling
 * Integrates parsing and execution of natural language commands
 */
export class StructuredToolOrchestrator {
  private handlers: ToolHandlers;
  private isInitialized = false;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    this.handlers = new ToolHandlers(ollamaBaseUrl);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Structured Tool Orchestrator...');
    await this.handlers.initialize();
    this.isInitialized = true;
    console.log('✅ Structured Tool Orchestrator initialized');
  }

  /**
   * Process natural language input through the complete tool calling pipeline
   */
  async processCommand(input: string): Promise<ToolCallResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    console.log('🎯 Processing Tool Command', {
      requestId,
      input,
      timestamp: new Date().toISOString()
    });

    // Step 1: Parse natural language to structured action using simple keyword matching
    const parseResult = this.parseInput(input);

    if (!parseResult.success) {
      const totalDuration = Date.now() - startTime;
      
      console.log('❌ Tool Command Failed at Parse Stage', {
        requestId,
        error: 'error' in parseResult ? parseResult.error : 'Unknown error',
        hasFallback: 'fallback' in parseResult && !!parseResult.fallback,
        duration: `${totalDuration}ms`
      });

      return {
        parseResult,
        totalDuration,
        timestamp: new Date()
      };
    }

    // Step 2: Execute the action
    const executionResult = await this.handlers.executeAction(parseResult.action!);
    const totalDuration = Date.now() - startTime;

    console.log('🎉 Tool Command Completed', {
      requestId,
      action: parseResult.action!.action,
      parseConfidence: parseResult.confidence,
      executionSuccess: executionResult.success,
      totalDuration: `${totalDuration}ms`,
      timestamp: new Date().toISOString()
    });

    return {
      parseResult,
      executionResult,
      totalDuration,
      timestamp: new Date()
    };
  }

  /**
   * Simple keyword-based parsing for demonstration
   */
  private parseInput(input: string): {
    success: true;
    action: ToolAction;
    confidence: number;
  } | {
    success: false;
    error: string;
    fallback?: Partial<ToolAction>;
  } {
    const inputLower = input.toLowerCase();

    try {
      // Create Company
      if (inputLower.includes('create') && inputLower.includes('company')) {
        const name = this.extractCompanyName(input) || 'New Company';
        const industry = this.extractIndustry(input) || 'tech';
        
        return {
          success: true,
          action: {
            action: 'createCompany',
            parameters: {
              name,
              description: input,
              industry: industry as any,
              tags: this.extractTags(input),
              services: ['Business Operations'],
              compliance: [],
              jurisdiction: 'US',
              employees: 100,
              founded: new Date().getFullYear()
            }
          },
          confidence: 0.9
        };
      }

      // Search Companies
      if (inputLower.includes('search') || inputLower.includes('find')) {
        return {
          success: true,
          action: {
            action: 'searchCompanies',
            parameters: {
              query: input,
              limit: 10
            }
          },
          confidence: 0.85
        };
      }

      // Generate API
      if (inputLower.includes('api') || inputLower.includes('generate')) {
        return {
          success: true,
          action: {
            action: 'generateApi',
            parameters: {
              companyId: 'auto',
              serviceName: 'Generated API Service',
              apiType: 'rest',
              authentication: 'jwt',
              endpoints: [
                {
                  path: '/api/v1/health',
                  method: 'GET',
                  description: 'Health check endpoint'
                }
              ]
            }
          },
          confidence: 0.8
        };
      }

      // Control Simulation
      if (inputLower.includes('start') || inputLower.includes('simulation')) {
        return {
          success: true,
          action: {
            action: 'controlSimulation',
            parameters: {
              command: 'start',
              tickRate: 500
            }
          },
          confidence: 0.75
        };
      }

      // Default fallback
      return {
        success: false,
        error: 'Could not parse command',
        fallback: {
          action: 'searchCompanies',
          parameters: {
            query: input,
            limit: 5
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  private extractCompanyName(input: string): string | null {
    const patterns = [
      /called\s+([A-Za-z][A-Za-z0-9\s]+?)(?:\s+that|\s+which|\s*$)/i,
      /named\s+([A-Za-z][A-Za-z0-9\s]+?)(?:\s+that|\s+which|\s*$)/i,
      /([A-Za-z][A-Za-z0-9\s]+?)\s+company/i,
      /"([^"]+)"/,
      /'([^']+)'/
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractIndustry(input: string): string | null {
    const industries = {
      'fintech': ['fintech', 'financial technology', 'payments', 'micropayments'],
      'banking': ['bank', 'banking', 'financial services'],
      'healthcare': ['healthcare', 'medical', 'health', 'hospital', 'clinic'],
      'tech': ['technology', 'software', 'ai', 'artificial intelligence'],
      'logistics': ['logistics', 'shipping', 'delivery', 'supply chain'],
      'defense': ['defense', 'security', 'military', 'cybersecurity'],
      'retail': ['retail', 'ecommerce', 'shopping', 'commerce'],
      'energy': ['energy', 'renewable', 'power', 'electricity'],
      'manufacturing': ['manufacturing', 'factory', 'production'],
      'telecom': ['telecom', 'telecommunications', '5g', 'network']
    };

    const inputLower = input.toLowerCase();
    
    for (const [industry, keywords] of Object.entries(industries)) {
      if (keywords.some(keyword => inputLower.includes(keyword))) {
        return industry;
      }
    }
    return null;
  }

  private extractTags(input: string): string[] {
    const inputLower = input.toLowerCase();
    const commonTags = [
      'fintech', 'banking', 'payments', 'ai', 'technology', 'healthcare',
      'logistics', 'security', 'retail', 'energy', 'manufacturing', 'telecom',
      'startup', 'enterprise', 'digital', 'cloud', 'iot', 'blockchain', 'micropayments'
    ];

    return commonTags.filter(tag => inputLower.includes(tag));
  }

  /**
   * Get available tools and their descriptions
   */
  getAvailableTools() {
    return {
      createCompany: {
        description: 'Create a new company with infrastructure simulation',
        examples: ['Create a company called MikuBank', 'Add a fintech startup']
      },
      searchCompanies: {
        description: 'Search for existing companies in the database',
        examples: ['Find healthcare companies', 'Search for AI startups']
      },
      generateApi: {
        description: 'Generate API specifications for a service',
        examples: ['Generate a REST API', 'Create payment API']
      },
      controlSimulation: {
        description: 'Control the infrastructure simulation state',
        examples: ['Start the simulation', 'Pause simulation']
      }
    };
  }

  /**
   * Quick test method to verify the system is working
   */
  async testSystem(): Promise<boolean> {
    try {
      console.log('🧪 Testing Structured Tool System...');
      
      const result = await this.processCommand('Search for fintech companies');
      
      const isWorking = result.parseResult.success && 
                       result.executionResult?.success === true;
      
      console.log('🧪 System Test Result:', isWorking ? '✅ PASS' : '❌ FAIL');
      return isWorking;
    } catch (error) {
      console.error('🧪 System Test Failed:', error);
      return false;
    }
  }
}

class ToolHandlers {
  private orchestrator: LangChainOrchestrator;
  private simulationEngine: SimulationEngine;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    this.orchestrator = new LangChainOrchestrator(ollamaBaseUrl);
    this.simulationEngine = new SimulationEngine();
  }

  async initialize(): Promise<void> {
    await this.orchestrator.initializeVectorMemory();
  }

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

  private async handleCreateCompany(action: CreateCompanyAction): Promise<ToolExecutionResult> {
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
        source: 'tool_creation'
      }
    };

    const companyId = await this.orchestrator.addCompanyToMemory(companyRecord);
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

  private async handleGenerateApi(action: GenerateApiAction): Promise<ToolExecutionResult> {
    const { parameters } = action;

    if (parameters.companyId === 'auto') {
      // Auto-select first available company
      const companies = await this.orchestrator.getAllCompaniesFromMemory();
      if (companies.length === 0) {
        return {
          success: false,
          message: 'No companies available for API generation',
          error: 'Please create a company first',
          timestamp: new Date()
        };
      }
      parameters.companyId = companies[0].id;
    }

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
  }

  private async handleSearchCompanies(action: SearchCompaniesAction): Promise<ToolExecutionResult> {
    const { parameters } = action;

    let results;
    
    if (parameters.query) {
      results = await this.orchestrator.searchCompaniesInMemory(parameters.query, parameters.limit);
    } else {
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
        result = { status: 'paused', tickRate: parameters.tickRate };
        break;
      case 'resume':
        result = { status: 'resumed' };
        break;
      case 'reset':
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

export { StructuredToolParser } from './parser';
export * from './schema';