import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { EntityType, InfrastructureEntity, FidelityLevel, CompanyMemoryRecord } from '../types/infrastructure';
import { VectorMemoryManager } from './vector-memory-manager';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Zod schemas for structured outputs
const InfrastructureEntitySchema = z.object({
  name: z.string().describe('Entity name'),
  type: z.enum(['dns_server', 'ntp_server', 'web_app', 'database', 'firewall', 'load_balancer', 'social_agent', 'api_service']).describe('Entity type'),
  hostname: z.string().describe('Hostname'),
  ports: z.array(z.object({
    number: z.number().int().min(1).max(65535),
    protocol: z.enum(['tcp', 'udp']),
    service: z.string(),
    status: z.enum(['open', 'closed', 'filtered']).default('open')
  })).default([]),
  metadata: z.object({
    description: z.string().optional()
  }).optional()
});

const ParsedInfrastructureSchema = z.object({
  entities: z.array(InfrastructureEntitySchema),
  connections: z.array(z.object({
    from: z.string().describe('Source hostname'),
    to: z.string().describe('Target hostname')
  }))
});

const OrganizationProfileSchema = z.object({
  name: z.string().describe('Company/organization name (exclude words like please, can, you, build, create)'),
  description: z.string().describe('Professional business description'),
  sector: z.string().describe('Business sector (e.g., Banking, Technology, Healthcare, Logistics)'),
  coreFunctions: z.array(z.string()).min(3).max(5).describe('Core business functions')
});

const EntityDescriptionSchema = z.object({
  description: z.string().describe('Detailed technical description for the infrastructure component')
});

export interface ParsedInfrastructure {
  entities: Partial<InfrastructureEntity>[];
  connections: Array<{ from: string; to: string }>;
}

export class LangChainOrchestrator {
  private llm: ChatOllama;
  private vectorMemory: VectorMemoryManager;
  private infrastructureParser: StructuredOutputParser<any>;
  private organizationParser: StructuredOutputParser<any>;
  private descriptionParser: StructuredOutputParser<any>;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    console.log('🚀 LangChain Orchestrator initializing...', {
      ollamaBaseUrl,
      model: 'llama3-groq-tool-use',
      timestamp: new Date().toISOString()
    });

    this.llm = new ChatOllama({
      baseUrl: ollamaBaseUrl,
      model: 'llama3-groq-tool-use',
      temperature: 0.1,
    });

    // Create structured output parsers for each schema
    this.infrastructureParser = StructuredOutputParser.fromZodSchema(ParsedInfrastructureSchema);
    this.organizationParser = StructuredOutputParser.fromZodSchema(OrganizationProfileSchema);
    this.descriptionParser = StructuredOutputParser.fromZodSchema(EntityDescriptionSchema);

    // Use singleton instance
    this.vectorMemory = VectorMemoryManager.getInstance(ollamaBaseUrl);

    console.log('✅ LangChain Orchestrator initialized successfully');
  }

  // Initialize vector memory
  public async initializeVectorMemory(): Promise<void> {
    await this.vectorMemory.initialize();
  }

  // Company memory methods
  public async addCompanyToMemory(company: Omit<CompanyMemoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const record: CompanyMemoryRecord = {
      ...company,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.vectorMemory.addCompanyRecord(record);
    return record.id;
  }

  public async searchCompaniesInMemory(query: string, limit: number = 5) {
    return await this.vectorMemory.searchCompanies(query, limit);
  }

  public async findSimilarCompanies(companyId: string, limit: number = 5) {
    return await this.vectorMemory.findSimilarCompanies(companyId, limit);
  }

  public async getAllCompaniesFromMemory() {
    return await this.vectorMemory.getAllCompanies();
  }

  public async updateCompanyInMemory(record: CompanyMemoryRecord) {
    await this.vectorMemory.updateCompanyRecord(record);
  }

  // Infrastructure CRUD methods for companies
  public async addInfrastructureToCompany(companyId: string, entity: InfrastructureEntity): Promise<string> {
    const companies = await this.getAllCompaniesFromMemory();
    const company = companies.find(c => c.id === companyId);
    
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    // Ensure infrastructure array exists
    if (!company.infrastructure) {
      company.infrastructure = [];
    }

    // Add unique ID if not provided
    if (!entity.id) {
      entity.id = require('uuid').v4();
    }

    // Generate position if not provided
    if (!entity.position) {
      entity.position = { 
        x: 200 + Math.random() * 400, 
        y: 200 + Math.random() * 300 
      };
    }

    // Add to company infrastructure
    company.infrastructure.push(entity);
    company.updatedAt = new Date();

    // Update in vector memory
    await this.updateCompanyInMemory(company);

    return entity.id;
  }

  public async removeInfrastructureFromCompany(companyId: string, entityId: string): Promise<void> {
    const companies = await this.getAllCompaniesFromMemory();
    const company = companies.find(c => c.id === companyId);
    
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    if (!company.infrastructure) {
      return; // Nothing to remove
    }

    // Remove entity and update connections
    company.infrastructure = company.infrastructure.filter(e => e.id !== entityId);
    
    // Remove connections to this entity
    company.infrastructure.forEach(entity => {
      entity.connections = entity.connections.filter(connId => connId !== entityId);
    });

    company.updatedAt = new Date();

    // Update in vector memory
    await this.updateCompanyInMemory(company);
  }

  public async updateCompanyInfrastructure(companyId: string, updatedEntity: InfrastructureEntity): Promise<void> {
    const companies = await this.getAllCompaniesFromMemory();
    const company = companies.find(c => c.id === companyId);
    
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    if (!company.infrastructure) {
      throw new Error(`No infrastructure found for company ${companyId}`);
    }

    // Find and update the entity
    const entityIndex = company.infrastructure.findIndex(e => e.id === updatedEntity.id);
    if (entityIndex === -1) {
      throw new Error(`Entity with ID ${updatedEntity.id} not found in company infrastructure`);
    }

    company.infrastructure[entityIndex] = updatedEntity;
    company.updatedAt = new Date();

    // Update in vector memory
    await this.updateCompanyInMemory(company);
  }

  public async getCompanyInfrastructure(companyId: string): Promise<InfrastructureEntity[]> {
    const companies = await this.getAllCompaniesFromMemory();
    const company = companies.find(c => c.id === companyId);
    
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    return company.infrastructure || [];
  }

  public async describeInfrastructureLayout(companyId: string): Promise<string> {
    const infrastructure = await this.getCompanyInfrastructure(companyId);
    
    if (infrastructure.length === 0) {
      return "No infrastructure components found for this company.";
    }

    const companies = await this.getAllCompaniesFromMemory();
    const company = companies.find(c => c.id === companyId);
    const companyName = company?.name || "Unknown Company";

    // Generate a descriptive layout summary
    const entityCounts = infrastructure.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const connectionCount = infrastructure.reduce((total, entity) => total + entity.connections.length, 0);

    let description = `${companyName} Infrastructure Layout:\n\n`;
    description += `Total Components: ${infrastructure.length}\n`;
    description += `Total Connections: ${connectionCount}\n\n`;

    description += "Component Breakdown:\n";
    Object.entries(entityCounts).forEach(([type, count]) => {
      description += `- ${type.replace('_', ' ').toUpperCase()}: ${count}\n`;
    });

    if (infrastructure.length > 0) {
      description += "\nKey Components:\n";
      infrastructure.slice(0, 5).forEach(entity => {
        const connectedTo = entity.connections.length > 0 ? 
          ` (connected to ${entity.connections.length} other components)` : 
          " (no connections)";
        description += `- ${entity.name} (${entity.type}) at ${entity.hostname}${connectedTo}\n`;
      });
    }

    return description;
  }

  public async parseInfrastructureDescription(description: string): Promise<ParsedInfrastructure> {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log('📤 LangChain Request [parseInfrastructureDescription] - Structured Output + Zod', {
      requestId,
      method: 'parseInfrastructureDescription',
      input: description,
      model: 'llama3-groq-tool-use',
      timestamp: new Date().toISOString(),
      inputLength: description.length
    });

    try {
      const startTime = Date.now();
      
      const prompt = PromptTemplate.fromTemplate(`
You are an infrastructure architect. Parse the natural language description into structured infrastructure components with entities and connections.

Description: {description}

Available entity types: dns_server, ntp_server, web_app, database, firewall, load_balancer, social_agent, api_service

{format_instructions}

Respond only with valid JSON, no additional text:
`);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        this.infrastructureParser
      ]);

      const result = await chain.invoke({
        description,
        format_instructions: this.infrastructureParser.getFormatInstructions()
      });

      const duration = Date.now() - startTime;
      
      // Validate with Zod
      const parsed = ParsedInfrastructureSchema.parse(result);
      
      console.log('📥 LangChain Success [parseInfrastructureDescription] - Structured Output + Zod', {
        requestId,
        duration: `${duration}ms`,
        entitiesCount: parsed.entities?.length || 0,
        connectionsCount: parsed.connections?.length || 0,
        validation: 'passed',
        timestamp: new Date().toISOString()
      });

      // Transform the parsed result
      const transformedResult = {
        entities: parsed.entities?.map((entity: any) => ({
          name: entity.name,
          type: this.mapStringToEntityType(entity.type),
          hostname: entity.hostname,
          ports: entity.ports || [],
          metadata: entity.metadata || { description: '' },
        })) || [],
        connections: parsed.connections?.map(conn => ({
          from: conn.from || '',
          to: conn.to || ''
        })).filter(conn => conn.from && conn.to) || [],
      };

      console.log('✨ LangChain Final Result [parseInfrastructureDescription]', {
        requestId,
        transformedEntities: transformedResult.entities,
        transformedConnections: transformedResult.connections,
        processingComplete: true,
        timestamp: new Date().toISOString()
      });

      return transformedResult;
    } catch (error) {
      console.error('❌ LangChain Request Failed [parseInfrastructureDescription]', {
        requestId,
        error: error.message,
        input: description,
        timestamp: new Date().toISOString()
      });
      
      // Return a fallback simple parsing
      const fallbackResult = this.fallbackParse(description);
      
      console.log('🔄 LangChain Fallback Used', {
        requestId,
        fallbackResult,
        timestamp: new Date().toISOString()
      });
      
      return fallbackResult;
    }
  }

  /**
   * Generate a response using a system prompt for chat functionality
   */
  public async generateResponse(systemPrompt: string): Promise<string> {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log('📤 LangChain Request [generateResponse] - System Prompt Chat', {
      requestId,
      method: 'generateResponse',
      promptLength: systemPrompt.length,
      model: 'llama3-groq-tool-use',
      timestamp: new Date().toISOString()
    });

    try {
      const startTime = Date.now();
      
      // Use a simple prompt template that passes the system prompt directly
      const prompt = PromptTemplate.fromTemplate(`{systemPrompt}`);
      
      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser()
      ]);

      const result = await chain.invoke({ systemPrompt });
      const duration = Date.now() - startTime;

      console.log('✅ LangChain Success [generateResponse] - System Prompt Chat', {
        requestId,
        duration: `${duration}ms`,
        responseLength: result.length,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      console.error('❌ LangChain Request Failed [generateResponse]', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      // Fallback response
      return "I'm here to help with your infrastructure! You can ask me to add components, update configurations, or describe your current setup. What would you like to work on?";
    }
  }

  /**
   * Enhanced organization creation with memory integration using structured output
   */
  public async createRootOrganizationWithMemory(description: string): Promise<Partial<InfrastructureEntity>> {
    // Try to find similar companies in memory first
    const similarCompanies = await this.searchCompaniesInMemory(description, 3);
    
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log('📤 LangChain Request [createRootOrganizationWithMemory] - Structured Output + Zod', {
      requestId,
      description,
      model: 'llama3-groq-tool-use',
      timestamp: new Date().toISOString()
    });

    let orgName = "Organization";
    let businessDescription = description;
    let coreFunctions: string[] = [];
    let sectorTags: string[] = [];

    try {
      const prompt = PromptTemplate.fromTemplate(`
You are a business analyst. Generate a professional organization profile from the description, excluding casual words like "please", "can", "you", "build", "create".

Description: {description}

{format_instructions}

Respond only with valid JSON, no additional text:
`);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        this.organizationParser
      ]);

      const result = await chain.invoke({
        description,
        format_instructions: this.organizationParser.getFormatInstructions()
      });

      // Validate with Zod
      const parsed = OrganizationProfileSchema.parse(result);
      
      orgName = parsed.name;
      businessDescription = parsed.description;
      coreFunctions = parsed.coreFunctions;
      sectorTags = this.generateSectorTags(parsed.sector);
      
      console.log('✨ Generated Organization Profile [Structured Output + Zod]', {
        requestId,
        name: orgName,
        sector: parsed.sector,
        coreFunctions,
        sectorTags,
        validation: 'passed'
      });
      
    } catch (error) {
      console.error('Error generating organization profile, using fallback:', error);
      // Fallback to existing extraction methods
      orgName = this.extractOrganizationName(description);
      coreFunctions = this.extractCoreFunctions(description);
      sectorTags = this.extractSectorTags(description);
    }

    // Create memory record for this new organization
    await this.addCompanyToMemory({
      name: orgName,
      description: businessDescription,
      sectorTags,
      services: coreFunctions,
      metadata: {
        source: 'user_prompt',
        similarCompanies: similarCompanies.map(c => c.record.name),
      }
    });

    return {
      type: EntityType.ORGANIZATION,
      name: orgName,
      hostname: `${orgName.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`,
      ip: '192.168.1.1',
      fidelity: FidelityLevel.VIRTUAL,
      ports: [],
      metadata: {
        description: businessDescription,
        coreFunctions: coreFunctions,
        internalEntities: [],
        similarCompanies: similarCompanies.map(c => c.record.name),
        memoryEnhanced: true
      },
      position: { x: 400, y: 300 },
      connections: []
    };
  }

  public async enhanceEntityDescription(entity: InfrastructureEntity): Promise<string> {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log('📤 LangChain Request [enhanceEntityDescription] - Structured Output + Zod', {
      requestId,
      method: 'enhanceEntityDescription',
      entityName: entity.name,
      entityType: entity.type,
      model: 'llama3-groq-tool-use',
      timestamp: new Date().toISOString()
    });

    try {
      const prompt = PromptTemplate.fromTemplate(`
You are a technical infrastructure expert. Generate detailed technical descriptions with realistic configuration notes and operational characteristics.

Component Details:
- Name: {name}
- Type: {type}
- Hostname: {hostname}
- Fidelity: {fidelity}

{format_instructions}

Respond only with valid JSON, no additional text:
`);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        this.descriptionParser
      ]);

      const startTime = Date.now();
      const result = await chain.invoke({
        name: entity.name,
        type: entity.type,
        hostname: entity.hostname,
        fidelity: entity.fidelity,
        format_instructions: this.descriptionParser.getFormatInstructions()
      });

      const duration = Date.now() - startTime;

      // Validate with Zod
      const parsed = EntityDescriptionSchema.parse(result);

      console.log('📥 LangChain Response [enhanceEntityDescription] - Structured Output + Zod', {
        requestId,
        duration: `${duration}ms`,
        responseLength: parsed.description.length,
        validation: 'passed',
        timestamp: new Date().toISOString()
      });

      return parsed.description;
    } catch (error) {
      console.error('❌ LangChain Request Failed [enhanceEntityDescription]', {
        requestId,
        error: error.message,
        entityName: entity.name,
        timestamp: new Date().toISOString()
      });
      
      const fallbackDescription = `${entity.type} component running on ${entity.hostname}`;
      
      console.log('🔄 LangChain Fallback Used [enhanceEntityDescription]', {
        requestId,
        fallbackDescription,
        timestamp: new Date().toISOString()
      });
      
      return fallbackDescription;
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

  private fallbackParse(description: string): ParsedInfrastructure {
    // Simple keyword-based fallback parsing
    const entities: Partial<InfrastructureEntity>[] = [];
    
    if (description.toLowerCase().includes('bank')) {
      entities.push({
        name: 'Bank Web Portal',
        type: EntityType.WEB_APP,
        hostname: 'portal.bank.local',
        ports: [{ number: 443, protocol: 'tcp', service: 'https', status: 'open' }],
      });
      
      entities.push({
        name: 'Core Banking Database',
        type: EntityType.DATABASE,
        hostname: 'db.bank.local',
        ports: [{ number: 5432, protocol: 'tcp', service: 'postgresql', status: 'open' }],
      });
    }

    return { entities, connections: [] };
  }

  private extractOrganizationName(description: string): string {
    // Simple extraction logic - you can enhance this with better NLP
    const words = description.split(' ');
    
    // Look for common organization indicators
    const orgIndicators = ['bank', 'company', 'corp', 'ltd', 'inc', 'fintech', 'startup', 'firm'];
    const foundIndicator = words.find(word => 
      orgIndicators.some(indicator => word.toLowerCase().includes(indicator))
    );
    
    if (foundIndicator) {
      const index = words.indexOf(foundIndicator);
      if (index > 0) {
        return `${words[index - 1]} ${foundIndicator}`.replace(/[^\w\s]/g, '');
      }
      return foundIndicator.replace(/[^\w\s]/g, '');
    }
    
    // Fallback: use first few words
    return words.slice(0, 2).join(' ').replace(/[^\w\s]/g, '') || 'Organization';
  }

  private extractCoreFunctions(description: string): string[] {
    const functions: string[] = [];
    const lowerDesc = description.toLowerCase();
    
    // Banking functions
    if (lowerDesc.includes('bank') || lowerDesc.includes('financial')) {
      functions.push('Banking Services', 'Customer Management', 'Transaction Processing');
    }
    
    // Fintech functions
    if (lowerDesc.includes('fintech') || lowerDesc.includes('payment')) {
      functions.push('Payment Processing', 'Digital Wallet', 'Financial Technology');
    }
    
    // Tech company functions
    if (lowerDesc.includes('tech') || lowerDesc.includes('software')) {
      functions.push('Software Development', 'Technology Services', 'Digital Solutions');
    }
    
    // E-commerce functions
    if (lowerDesc.includes('ecommerce') || lowerDesc.includes('online store')) {
      functions.push('Online Sales', 'Inventory Management', 'Customer Support');
    }
    
    // Default functions if none detected
    if (functions.length === 0) {
      functions.push('Business Operations', 'Customer Service', 'Data Management');
    }
    
    return functions;
  }

  private extractSectorTags(description: string): string[] {
    const tags: string[] = [];
    const lowerDesc = description.toLowerCase();
    
    // Financial sector tags
    if (lowerDesc.includes('bank') || lowerDesc.includes('financial')) {
      tags.push('🏦 Banking', '💰 Financial Services');
    }
    
    // Technology tags
    if (lowerDesc.includes('tech') || lowerDesc.includes('software') || lowerDesc.includes('ai')) {
      tags.push('💻 Technology', '🤖 AI');
    }
    
    // Fintech tags
    if (lowerDesc.includes('fintech') || lowerDesc.includes('payment')) {
      tags.push('🏦 FinTech', '💳 Payments');
    }
    
    // Logistics tags
    if (lowerDesc.includes('logistics') || lowerDesc.includes('shipping') || lowerDesc.includes('delivery')) {
      tags.push('🚚 Logistics', '📦 Delivery');
    }
    
    // Defense tags
    if (lowerDesc.includes('defense') || lowerDesc.includes('military') || lowerDesc.includes('security')) {
      tags.push('🛡️ Defense', '🔒 Security');
    }
    
    // Healthcare tags
    if (lowerDesc.includes('health') || lowerDesc.includes('medical') || lowerDesc.includes('hospital')) {
      tags.push('🏥 Healthcare', '⚕️ Medical');
    }
    
    // Default tags if none detected
    if (tags.length === 0) {
      tags.push('🏢 Business', '⚙️ Operations');
    }
    
    return tags;
  }

  private generateSectorTags(sector: string): string[] {
    const tags: string[] = [];
    const lowerSector = sector.toLowerCase();
    
    // Financial sector tags
    if (lowerSector.includes('bank') || lowerSector.includes('financial')) {
      tags.push('🏦 Banking', '💰 Financial Services');
    }
    
    // Technology tags
    if (lowerSector.includes('tech') || lowerSector.includes('software') || lowerSector.includes('ai')) {
      tags.push('💻 Technology', '🤖 AI');
    }
    
    // Healthcare tags
    if (lowerSector.includes('health') || lowerSector.includes('medical')) {
      tags.push('🏥 Healthcare', '⚕️ Medical');
    }
    
    // Logistics tags
    if (lowerSector.includes('logistics') || lowerSector.includes('shipping')) {
      tags.push('🚚 Logistics', '📦 Delivery');
    }
    
    // Defense tags
    if (lowerSector.includes('defense') || lowerSector.includes('military') || lowerSector.includes('security')) {
      tags.push('🛡️ Defense', '🔒 Security');
    }
    
    // Education tags
    if (lowerSector.includes('education') || lowerSector.includes('university') || lowerSector.includes('school')) {
      tags.push('🎓 Education', '📚 Learning');
    }
    
    // Default tags if none detected
    if (tags.length === 0) {
      tags.push('🏢 Business', '⚙️ Operations');
    }
    
    return tags;
  }
}
