import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { CompanyProfile, SimulatedComponent, InfrastructureTopology } from './types';
import { EntityType, InfrastructureEntity } from '../../types/infrastructure';
import { SimulationEngine } from '../../core/simulation-engine';

// Zod schemas for infrastructure generation
const InfrastructureComponentSchema = z.object({
  id: z.string().describe('Unique identifier for the component'),
  type: z.enum(['dns_server', 'ntp_server', 'web_app', 'database', 'firewall', 'load_balancer', 'social_agent', 'api_service']).describe('Component type'),
  name: z.string().describe('Descriptive name for the component'),
  description: z.string().describe('Brief technical description'),
  hostPrefix: z.string().describe('Short identifier for hostname generation')
});

const InfrastructureTopologySchema = z.object({
  components: z.array(InfrastructureComponentSchema).min(1).describe('Infrastructure components'),
  connections: z.array(z.object({
    from: z.string().describe('Source component ID'),
    to: z.string().describe('Target component ID')
  })).describe('Connections between components')
});

const OpenApiSpecSchema = z.object({
  openapi: z.literal('3.0.0'),
  info: z.object({
    title: z.string(),
    version: z.string(),
    description: z.string()
  }),
  paths: z.record(z.any()).describe('API endpoints')
});

export class InfrastructureBuilder {
  private llm: ChatOllama;
  private simulationEngine: SimulationEngine;
  private topologyParser: StructuredOutputParser<any>;
  private openApiParser: StructuredOutputParser<any>;

  constructor(simulationEngine: SimulationEngine, ollamaBaseUrl: string = 'http://localhost:11434') {
    this.simulationEngine = simulationEngine;
    this.llm = new ChatOllama({
      baseUrl: ollamaBaseUrl,
      model: 'smangrul/llama-3-8b-instruct-function-calling',
      temperature: 0.1,
    });

    // Create structured output parsers
    this.topologyParser = StructuredOutputParser.fromZodSchema(InfrastructureTopologySchema);
    this.openApiParser = StructuredOutputParser.fromZodSchema(OpenApiSpecSchema);
  }

  public async buildInfrastructure(companyProfile: CompanyProfile): Promise<CompanyProfile> {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log('📤 InfrastructureBuilder Request [Structured Output + Zod]', {
      requestId,
      companyName: companyProfile.name,
      sector: companyProfile.sector,
      model: 'smangrul/llama-3-8b-instruct-function-calling',
      timestamp: new Date().toISOString()
    });

    try {
      // Generate infrastructure topology
      const topology = await this.generateTopology(companyProfile, requestId);
      
      // Convert components to simulation entities
      const infraComponents: SimulatedComponent[] = [];
      
      // Add each entity to the simulation
      for (const entity of topology.entities) {
        // Add the entity to the simulation engine
        const entityId = this.simulationEngine.addEntity(entity);
        
        // Create corresponding component for our company profile
        const component: SimulatedComponent = {
          id: entityId,
          type: entity.type?.toString() || 'web_app',
          fidelity: 'virtual',
          description: entity.metadata?.description || `${entity.name} component`,
          openApiStub: entity.type === EntityType.WEB_APP ? await this.generateOpenApiStub(entity.name || '', entity.metadata?.description || '', companyProfile, requestId) : undefined
        };
        
        infraComponents.push(component);
      }
      
      // Add connections
      topology.connections.forEach(connection => {
        const fromEntity = topology.entities.find(e => e.hostname === connection.from);
        const toEntity = topology.entities.find(e => e.hostname === connection.to);
        
        if (fromEntity && fromEntity.id && toEntity && toEntity.id) {
          const entity = this.simulationEngine.getState().entities[fromEntity.id];
          if (entity && !entity.connections.includes(toEntity.id)) {
            entity.connections.push(toEntity.id);
          }
        }
      });

      console.log('✅ InfrastructureBuilder Success [Structured Output + Zod]', {
        requestId,
        componentsGenerated: infraComponents.length,
        connectionsEstablished: topology.connections.length,
        timestamp: new Date().toISOString()
      });
      
      // Return updated company profile with infrastructure
      return {
        ...companyProfile,
        infrastructure: infraComponents,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ InfrastructureBuilder Failed [Structured Output + Zod]', {
        requestId,
        error: error.message,
        companyName: companyProfile.name,
        timestamp: new Date().toISOString()
      });

      const fallbackResult = this.fallbackInfrastructure(companyProfile);
      
      console.log('🔄 InfrastructureBuilder Fallback Used', {
        requestId,
        fallbackComponents: fallbackResult.infrastructure.length,
        timestamp: new Date().toISOString()
      });

      return fallbackResult;
    }
  }

  private async generateTopology(companyProfile: CompanyProfile, requestId: string): Promise<InfrastructureTopology> {
    try {
      const startTime = Date.now();

      const prompt = PromptTemplate.fromTemplate(`
You are an infrastructure architect. Design realistic infrastructure topologies that support company operations based on their sector and requirements.

Company Profile:
- Name: {name}
- Sector: {sector}
- Core Functions: {coreFunctions}
- Regulatory Requirements: {regulatoryRequirements}
- Description: {description}

Available component types: dns_server, ntp_server, web_app, database, firewall, load_balancer, social_agent, api_service

{format_instructions}

Respond only with valid JSON, no additional text:
`);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        this.topologyParser
      ]);

      const result = await chain.invoke({
        name: companyProfile.name,
        sector: companyProfile.sector,
        coreFunctions: companyProfile.coreFunctions.join(', '),
        regulatoryRequirements: (companyProfile.regulatoryRequirements || []).join(', '),
        description: companyProfile.description,
        format_instructions: this.topologyParser.getFormatInstructions()
      });

      const duration = Date.now() - startTime;

      // Validate with Zod
      const parsed = InfrastructureTopologySchema.parse(result);
      
      console.log('✨ Infrastructure Topology Generated [Structured Output + Zod]', {
        requestId,
        duration: `${duration}ms`,
        componentsCount: parsed.components.length,
        connectionsCount: parsed.connections.length,
        validation: 'passed',
        timestamp: new Date().toISOString()
      });

      // Transform components into InfrastructureEntity objects
      const entities = parsed.components.map((component: any) => {
        // Generate a hostname based on the component
        const hostname = `${component.hostPrefix || 'host'}-${component.id}.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`;
        
        // Map the component to an entity
        return {
          id: component.id,
          name: component.name,
          type: this.mapStringToEntityType(component.type),
          hostname: hostname,
          metadata: { description: component.description }
        };
      });
      
      // Process connections
      const connections = parsed.connections.map((conn: any) => {
        const fromEntity = entities.find((e: any) => e.id === conn.from);
        const toEntity = entities.find((e: any) => e.id === conn.to);
        
        return {
          from: fromEntity?.hostname || conn.from,
          to: toEntity?.hostname || conn.to
        };
      });
      
      return { entities, connections };
    } catch (error) {
      console.error('Error generating topology with structured output:', error);
      return this.fallbackTopology(companyProfile);
    }
  }

  private async generateOpenApiStub(serviceName: string, serviceDescription: string, companyProfile: CompanyProfile, requestId: string): Promise<string> {
    try {
      const startTime = Date.now();

      const prompt = PromptTemplate.fromTemplate(`
You are an API architect. Generate simplified OpenAPI 3.0 specifications with 3-5 essential endpoints based on the service requirements and company context.

Service Details:
- Service: {serviceName}
- Description: {serviceDescription}
- Company Sector: {sector}
- Core Functions: {coreFunctions}

{format_instructions}

Respond only with valid JSON, no additional text:
`);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        this.openApiParser
      ]);

      const result = await chain.invoke({
        serviceName,
        serviceDescription,
        sector: companyProfile.sector,
        coreFunctions: companyProfile.coreFunctions.join(', '),
        format_instructions: this.openApiParser.getFormatInstructions()
      });

      const duration = Date.now() - startTime;

      // Validate with Zod
      const parsed = OpenApiSpecSchema.parse(result);
      
      console.log('✨ OpenAPI Spec Generated [Structured Output + Zod]', {
        requestId,
        serviceName,
        duration: `${duration}ms`,
        endpointsCount: Object.keys(parsed.paths).length,
        validation: 'passed',
        timestamp: new Date().toISOString()
      });

      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      console.error('Error generating OpenAPI stub with structured output:', error);
      return JSON.stringify(this.fallbackOpenApi(serviceName), null, 2);
    }
  }

  private mapStringToEntityType(typeString: string): EntityType {
    const mapping: Record<string, EntityType> = {
      'dns_server': EntityType.DNS_SERVER,
      'ntp_server': EntityType.NTP_SERVER,
      'web_app': EntityType.WEB_APP,
      'database': EntityType.DATABASE,
      'firewall': EntityType.FIREWALL,
      'load_balancer': EntityType.LOAD_BALANCER,
      'social_agent': EntityType.SOCIAL_AGENT,
      'api_service': EntityType.API_SERVICE,
      'rest_api': EntityType.API_SERVICE,
      'api': EntityType.API_SERVICE,
    };
    return mapping[typeString] || EntityType.WEB_APP;
  }

  private fallbackTopology(companyProfile: CompanyProfile): InfrastructureTopology {
    const entities: Partial<InfrastructureEntity>[] = [
      {
        name: `${companyProfile.name} Website`,
        type: EntityType.WEB_APP,
        hostname: `web.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`,
        metadata: { description: 'Main website' }
      },
      {
        name: `${companyProfile.name} Database`,
        type: EntityType.DATABASE,
        hostname: `db.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`,
        metadata: { description: 'Primary database storing customer data' }
      },
      {
        name: `${companyProfile.name} DNS Server`,
        type: EntityType.DNS_SERVER,
        hostname: `dns.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`,
        metadata: { description: 'Corporate DNS server' }
      }
    ];

    // Add sector-specific components
    if (companyProfile.sector === 'Banking') {
      entities.push({
        name: 'Payment Gateway',
        type: EntityType.WEB_APP,
        hostname: `payments.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`,
        metadata: { description: 'Payment processing service' }
      });
    }

    return {
      entities,
      connections: [
        { from: `web.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`, 
          to: `db.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local` },
        { from: `web.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`, 
          to: `dns.${companyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local` }
      ]
    };
  }

  private fallbackInfrastructure(companyProfile: CompanyProfile): CompanyProfile {
    const topology = this.fallbackTopology(companyProfile);
    const infraComponents: SimulatedComponent[] = [];
    
    // Add each entity to the simulation
    for (const entity of topology.entities) {
      // Add the entity to the simulation engine
      const entityId = this.simulationEngine.addEntity(entity);
      
      // Create corresponding component
      const component: SimulatedComponent = {
        id: entityId,
        type: entity.type?.toString() || 'web_app',
        fidelity: 'virtual',
        description: entity.metadata?.description || `${entity.name} component`,
        openApiStub: entity.type === EntityType.WEB_APP ? JSON.stringify(this.fallbackOpenApi(entity.name || '')) : undefined
      };
      
      infraComponents.push(component);
    }
    
    return {
      ...companyProfile,
      infrastructure: infraComponents,
      updatedAt: new Date().toISOString()
    };
  }

  private fallbackOpenApi(serviceName: string): any {
    return {
      openapi: "3.0.0",
      info: {
        title: serviceName,
        version: "1.0.0",
        description: `API for ${serviceName}`
      },
      paths: {
        "/api/status": {
          get: {
            summary: "Get service status",
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        status: { type: "string" },
                        version: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/api/health": {
          get: {
            summary: "Health check endpoint",
            responses: {
              "200": {
                description: "Service is healthy"
              }
            }
          }
        }
      }
    };
  }
}