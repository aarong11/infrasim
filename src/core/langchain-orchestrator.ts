import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { EntityType, InfrastructureEntity, FidelityLevel, CompanyMemoryRecord } from '../types/infrastructure';
import { VectorMemoryManager } from './vector-memory-manager';
import { DualModelManager, ModelRole, ModelConfig, ModelInstance } from './model-manager';
import { useAppStore } from '../store/app-store';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Enhanced retry configuration for Llama models
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2
};

// Processing modes for different model types
export enum ProcessingMode {
  LLAMA_CHAT = 'llama_chat',           // Llama models with chat formatting
  OPENAI_TOOLS = 'openai_tools',       // OpenAI-style function calling
  GROQ_TOOLS = 'groq_tools',           // Groq-optimized tool calling
  STRUCTURED_OUTPUT = 'structured_output', // Traditional structured output parsing
  AUTO_DETECT = 'auto_detect'          // Auto-detect based on model name
}

// Model configuration mapping - keeping for backward compatibility
interface LegacyModelConfig {
  mode: ProcessingMode;
  supportsTools: boolean;
  requiresSpecialFormatting: boolean;
  retryConfig: RetryConfig;
}

const MODEL_CONFIGS: Record<string, LegacyModelConfig> = {
  // Llama-based models
  'llama': {
    mode: ProcessingMode.LLAMA_CHAT,
    supportsTools: false,
    requiresSpecialFormatting: true,
    retryConfig: DEFAULT_RETRY_CONFIG
  },
  'smangrul/llama-3-8b-instruct-function-calling': {
    mode: ProcessingMode.LLAMA_CHAT,
    supportsTools: false,
    requiresSpecialFormatting: true,
    retryConfig: DEFAULT_RETRY_CONFIG
  },
  // OpenAI-style models
  'gpt-3.5-turbo': {
    mode: ProcessingMode.OPENAI_TOOLS,
    supportsTools: true,
    requiresSpecialFormatting: false,
    retryConfig: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 }
  },
  'gpt-4': {
    mode: ProcessingMode.OPENAI_TOOLS,
    supportsTools: true,
    requiresSpecialFormatting: false,
    retryConfig: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 }
  },
  // Local models that support structured output
  'mistral': {
    mode: ProcessingMode.STRUCTURED_OUTPUT,
    supportsTools: false,
    requiresSpecialFormatting: false,
    retryConfig: DEFAULT_RETRY_CONFIG
  },
  'codellama': {
    mode: ProcessingMode.STRUCTURED_OUTPUT,
    supportsTools: false,
    requiresSpecialFormatting: false,
    retryConfig: DEFAULT_RETRY_CONFIG
  }
};

// Enhanced JSON parsing with multiple strategies
class LlamaJsonParser {
  static parseWithRetry(jsonString: string): any {
    // Strategy 1: Direct parsing
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      // Strategy 2: Extract JSON from markdown code blocks
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try {
          return JSON.parse(codeBlockMatch[1].trim());
        } catch (e2) {
          // Continue to next strategy
        }
      }

      // Strategy 3: Extract JSON from assistant response format
      const assistantMatch = jsonString.match(/assistant<\|end_header_id\|>\s*\n*([\s\S]*?)(?:\n\n|$)/);
      if (assistantMatch) {
        try {
          const content = assistantMatch[1].trim();
          // Try to find JSON in the assistant response
          const nestedCodeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (nestedCodeBlock) {
            return JSON.parse(nestedCodeBlock[1].trim());
          }
          return JSON.parse(content);
        } catch (e2) {
          // Continue to next strategy
        }
      }

      // Strategy 4: Find any JSON-like structure in the text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e3) {
          // Strategy 5: Clean common formatting issues and try again
          let cleaned = jsonMatch[0];
          
          // Remove common prefixes/suffixes
          cleaned = cleaned
            .replace(/^[^{]*/, '') // Remove everything before first {
            .replace(/[^}]*$/, '}') // Remove everything after last }
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .replace(/^\s*assistant<\|end_header_id\|>\s*\n*/g, '')
            .replace(/\n\n.*$/g, '')
            .trim();
          
          try {
            return JSON.parse(cleaned);
          } catch (e4) {
            // Strategy 6: Try to fix common JSON formatting issues
            const fixedJson = cleaned
              .replace(/,\s*}/g, '}') // Remove trailing commas
              .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
              .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
              .replace(/:\s*'([^']*?)'/g, ': "$1"') // Convert single quotes to double
              .replace(/\\'/g, "'"); // Fix escaped quotes
            
            try {
              return JSON.parse(fixedJson);
            } catch (e5) {
              throw new Error(`Failed to parse JSON after all strategies. Original error: ${e.message}. Last attempt: ${e5.message}`);
            }
          }
        }
      }
      
      throw new Error(`No JSON found in response: ${jsonString.substring(0, 300)}...`);
    }
  }
}

// Enhanced prompt templates for Llama models
class LlamaPromptTemplates {
  static createSystemPrompt(instruction: string, schema: any, examples?: string): string {
    // Escape curly braces in the schema to prevent template parsing errors
    const schemaString = JSON.stringify(schema, null, 2)
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}');
    
    const examplesString = examples ? examples
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}') : '';

    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert assistant that responds only with valid JSON matching the provided schema.

INSTRUCTION: ${instruction}

SCHEMA: ${schemaString}

${examples ? `EXAMPLES: ${examplesString}` : ''}

RULES:
1. Respond ONLY with valid JSON
2. Do not include any text before or after the JSON
3. Ensure all required fields are present
4. Use the exact field names from the schema

<|eot_id|><|start_header_id|>user<|end_header_id|>

{input}

<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;
  }

  static createChatPrompt(systemMessage: string): string {
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${systemMessage}

<|eot_id|><|start_header_id|>user<|end_header_id|>

{input}

<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;
  }
}

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
  private vectorMemory: VectorMemoryManager;
  private infrastructureParser: StructuredOutputParser<any>;
  private organizationParser: StructuredOutputParser<any>;
  private descriptionParser: StructuredOutputParser<any>;
  private modelManager: DualModelManager;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    console.log('🚀 LangChain Orchestrator initializing with dual model support...', {
      ollamaBaseUrl,
      timestamp: new Date().toISOString()
    });

    // Initialize dual model manager
    this.modelManager = new DualModelManager(ollamaBaseUrl);

    // Create structured output parsers for each schema
    this.infrastructureParser = StructuredOutputParser.fromZodSchema(ParsedInfrastructureSchema);
    this.organizationParser = StructuredOutputParser.fromZodSchema(OrganizationProfileSchema);
    this.descriptionParser = StructuredOutputParser.fromZodSchema(EntityDescriptionSchema);

    // Use singleton instance
    this.vectorMemory = VectorMemoryManager.getInstance(ollamaBaseUrl);

    console.log('✅ LangChain Orchestrator initialized with dual model support');
  }

  /**
   * Log LLM interaction to the global store (works in both browser and server)
   */
  private logLLMInteraction(
    modelName: string,
    provider: string,
    prompt: string,
    response: string,
    type: 'chat' | 'tools' | 'parsing' | 'agent',
    duration?: number,
    error?: string,
    metadata?: Record<string, any>
  ) {
    try {
      // Try to log to the store if available
      const { useAppStore } = require('../store/app-store');
      const { addLog } = useAppStore.getState();
      
      addLog({
        modelName,
        provider,
        prompt: prompt.substring(0, 2000), // Limit prompt length for UI
        response: response.substring(0, 2000), // Limit response length for UI
        type,
        duration,
        error,
        metadata
      });
      
      // Also console log for server-side visibility
      console.log('📝 LLM Interaction:', {
        modelName,
        provider,
        type,
        duration: duration ? `${duration}ms` : 'N/A',
        promptLength: prompt.length,
        responseLength: response.length,
        error: error || 'None',
        metadata
      });
    } catch (err) {
      console.warn('Failed to log LLM interaction:', err);
      // Fallback to console-only logging
      console.log('📝 LLM Interaction (fallback):', {
        modelName,
        provider,
        type,
        duration: duration ? `${duration}ms` : 'N/A',
        error: error || 'None'
      });
    }
  }

  /**
   * Configure models for different roles
   */
  public async configureModels(config: {
    chatModel: ModelConfig;
    toolsModel: ModelConfig;
    ollamaHost?: string;
  }): Promise<void> {
    await this.modelManager.configureModels(config);
  }

  /**
   * Switch a specific model by role
   */
  public async switchModel(role: ModelRole, config: ModelConfig, ollamaHost?: string): Promise<void> {
    await this.modelManager.switchModel(role, config, ollamaHost);
  }

  /**
   * Get current models information
   */
  public getModelsInfo(): { chat: ModelInstance | null; tools: ModelInstance | null } {
    return this.modelManager.getModelsInfo();
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

  /**
   * Multi-mode infrastructure parsing - routes to appropriate processor based on model
   */
  public async parseInfrastructureDescription(description: string): Promise<ParsedInfrastructure> {
    try {
      const toolsModel = this.modelManager.getModel(ModelRole.TOOLS);
      console.log(`🚀 Using tools model for infrastructure parsing: ${toolsModel.name}`);
      
      // Use tools model for structured parsing
      return await this.parseInfrastructureWithRetry(description);
    } catch (error) {
      console.warn('⚠️ Tools model not configured, using fallback parsing', error instanceof Error ? error.message : 'Unknown error');
      
      // Fallback to simple parsing when models aren't configured
      return this.fallbackParse(description);
    }
  }

  /**
   * Enhanced method with retry logic and model-specific prompting for infrastructure parsing
   */
  private async parseInfrastructureWithRetry(description: string, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG): Promise<ParsedInfrastructure> {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    console.log(`🔧 Starting infrastructure parsing for: "${description.substring(0, 100)}..."`, {
      requestId,
      fullDescription: description
    });
    
    const toolsModel = this.modelManager.getModel(ModelRole.TOOLS);
    
    // Route to appropriate parsing method based on processing mode
    if (toolsModel.processingMode === ProcessingMode.OPENAI_TOOLS) {
      return await this.parseWithOpenAITools(description, toolsModel, requestId);
    } else {
      return await this.parseWithCustomJsonParsing(description, toolsModel, requestId, retryConfig);
    }
  }

  /**
   * Parse infrastructure using OpenAI-style function calling (for Groq models)
   */
  private async parseWithOpenAITools(description: string, toolsModel: ModelInstance, requestId: string): Promise<ParsedInfrastructure> {
    console.log(`🎯 Using OpenAI-style function calling for infrastructure parsing`, {
      requestId,
      modelName: toolsModel.name
    });

    try {
      const startTime = Date.now();
      
      // Use LangChain's structured output parser with OpenAI-style formatting
      const prompt = PromptTemplate.fromTemplate(`
Parse the following infrastructure description into a structured format:

{description}

Return the result as valid JSON matching the ParsedInfrastructure schema.
`);

      const chain = RunnableSequence.from([
        prompt,
        toolsModel.llm,
        this.infrastructureParser
      ]);

      const result = await chain.invoke({ description });
      const duration = Date.now() - startTime;

      console.log('✅ OpenAI-style infrastructure parsing successful', {
        requestId,
        duration: `${duration}ms`,
        entitiesCount: result.entities?.length || 0,
        connectionsCount: result.connections?.length || 0
      });

      return {
        entities: result.entities?.map((entity: any) => ({
          name: entity.name,
          type: this.mapStringToEntityType(entity.type),
          hostname: entity.hostname,
          ports: entity.ports || [],
          metadata: entity.metadata || { description: '' },
        })) || [],
        connections: result.connections?.map((conn: any) => ({
          from: conn.from || '',
          to: conn.to || ''
        })).filter((conn: any) => conn.from && conn.to) || [],
      };

    } catch (error) {
      console.warn(`❌ OpenAI-style parsing failed, falling back to custom parser`, {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to custom JSON parsing if OpenAI-style fails
      return await this.parseWithCustomJsonParsing(description, toolsModel, requestId, DEFAULT_RETRY_CONFIG);
    }
  }

  /**
   * Parse infrastructure using custom JSON parsing with retry (for Llama models)
   */
  private async parseWithCustomJsonParsing(description: string, toolsModel: ModelInstance, requestId: string, retryConfig: RetryConfig): Promise<ParsedInfrastructure> {
    console.log(`🔧 Using custom JSON parsing for infrastructure parsing`, {
      requestId,
      modelName: toolsModel.name
    });
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        console.log(`🔄 Attempt ${attempt}/${retryConfig.maxAttempts} [parseWithCustomJsonParsing]`, {
          requestId,
          attempt,
          timestamp: new Date().toISOString()
        });

        const schema = zodToJsonSchema(ParsedInfrastructureSchema);
        
        // Create a more direct and focused prompt for infrastructure parsing
        const systemPrompt = `You must respond with ONLY valid JSON. No explanations, no markdown, no text - just pure JSON.

Parse this infrastructure description into the exact JSON format below:

{
  "entities": [
    {
      "name": "Component Name",
      "type": "web_app|database|firewall|load_balancer|dns_server|ntp_server|api_service|social_agent",
      "hostname": "hostname.domain.com",
      "ports": [{"number": 443, "protocol": "tcp", "service": "https", "status": "open"}],
      "metadata": {"description": "Brief description"}
    }
  ],
  "connections": [
    {"from": "hostname1.domain.com", "to": "hostname2.domain.com"}
  ]
}

CRITICAL: 
- Response must be valid JSON only
- No markdown code blocks
- No explanatory text before or after
- protocol must be "tcp" or "udp" only
- Use entity types: web_app, database, firewall, load_balancer, dns_server, ntp_server, api_service, social_agent

Description to parse: ${description}`;

        const result = await toolsModel.llm.invoke(systemPrompt);
        const rawResponse = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
        const duration = Date.now() - attemptStartTime;

        // Log the LLM interaction
        this.logLLMInteraction(
          toolsModel.name,
          'ollama',
          `Infrastructure parsing attempt ${attempt}`,
          '',
          'parsing',
          duration,
          undefined,
          { attempt, requestId, description: description.substring(0, 100) }
        );

        console.log(`🔍 Raw LLM response preview: "${rawResponse.substring(0, 200)}..."`, {
          requestId,
          attempt,
          responseLength: rawResponse.length
        });

        // Parse with enhanced JSON parser
        const parsed = LlamaJsonParser.parseWithRetry(rawResponse);
        
        // Validate with Zod
        const validated = ParsedInfrastructureSchema.parse(parsed);

        console.log('✅ Custom JSON parsing successful', {
          requestId,
          attempt,
          duration: `${duration}ms`,
          entitiesCount: validated.entities?.length || 0,
          connectionsCount: validated.connections?.length || 0
        });

        return {
          entities: validated.entities?.map((entity: any) => ({
            name: entity.name,
            type: this.mapStringToEntityType(entity.type),
            hostname: entity.hostname,
            ports: entity.ports || [],
            metadata: entity.metadata || { description: '' },
          })) || [],
          connections: validated.connections?.map(conn => ({
            from: conn.from || '',
            to: conn.to || ''
          })).filter(conn => conn.from && conn.to) || [],
        };

      } catch (error) {
        const duration = Date.now() - attemptStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log the failed attempt
        this.logLLMInteraction(
          toolsModel.name,
          'ollama',
          `Infrastructure parsing attempt ${attempt}`,
          '',
          'parsing',
          duration,
          errorMessage,
          { attempt, requestId, willRetry: attempt < retryConfig.maxAttempts }
        );

        console.warn(`❌ Attempt ${attempt} failed [parseWithCustomJsonParsing]`, {
          requestId,
          attempt,
          error: errorMessage,
          willRetry: attempt < retryConfig.maxAttempts
        });

        if (attempt === retryConfig.maxAttempts) {
          console.error('🚨 All attempts failed, using fallback', { requestId });
          return this.fallbackParse(description);
        }

        // Exponential backoff
        const delay = Math.min(
          DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, attempt - 1),
          DEFAULT_RETRY_CONFIG.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return this.fallbackParse(description);
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

  /**
   * Simple fallback parsing when LLM fails
   */
  private fallbackParse(description: string): ParsedInfrastructure {
    console.log('🔧 Using fallback parsing for:', description.substring(0, 100));
    
    const entities: Partial<InfrastructureEntity>[] = [];
    const lowerDesc = description.toLowerCase();
    
    // Banking infrastructure
    if (lowerDesc.includes('bank') || lowerDesc.includes('financial')) {
      entities.push({
        name: 'Banking Web Portal',
        type: EntityType.WEB_APP,
        hostname: 'portal.bank.local',
        ports: [{ number: 443, protocol: 'tcp', service: 'https', status: 'open' }],
        metadata: { description: 'Customer-facing web portal for banking services' }
      });
      
      entities.push({
        name: 'Core Banking Database',
        type: EntityType.DATABASE,
        hostname: 'coredb.bank.local',
        ports: [{ number: 5432, protocol: 'tcp', service: 'postgresql', status: 'open' }],
        metadata: { description: 'Primary database for banking transactions and customer data' }
      });
      
      entities.push({
        name: 'Security Firewall',
        type: EntityType.FIREWALL,
        hostname: 'firewall.bank.local',
        ports: [{ number: 22, protocol: 'tcp', service: 'ssh', status: 'open' }],
        metadata: { description: 'Network security firewall protecting banking infrastructure' }
      });
    }
    
    // Technology/Software infrastructure
    else if (lowerDesc.includes('tech') || lowerDesc.includes('software') || lowerDesc.includes('app')) {
      entities.push({
        name: 'Application Server',
        type: EntityType.WEB_APP,
        hostname: 'app.company.local',
        ports: [{ number: 8080, protocol: 'tcp', service: 'http', status: 'open' }],
        metadata: { description: 'Main application server hosting business logic' }
      });
      
      entities.push({
        name: 'API Gateway',
        type: EntityType.API_SERVICE,
        hostname: 'api.company.local',
        ports: [{ number: 443, protocol: 'tcp', service: 'https', status: 'open' }],
        metadata: { description: 'API gateway for external integrations' }
      });
      
      entities.push({
        name: 'Load Balancer',
        type: EntityType.LOAD_BALANCER,
        hostname: 'lb.company.local',
        ports: [{ number: 80, protocol: 'tcp', service: 'http', status: 'open' }],
        metadata: { description: 'Load balancer distributing traffic across application servers' }
      });
    }
    
    // Default infrastructure
    else {
      entities.push({
        name: 'Web Server',
        type: EntityType.WEB_APP,
        hostname: 'web.company.local',
        ports: [{ number: 80, protocol: 'tcp', service: 'http', status: 'open' }],
        metadata: { description: 'Main web server hosting company website' }
      });
      
      entities.push({
        name: 'Database Server',
        type: EntityType.DATABASE,
        hostname: 'db.company.local',
        ports: [{ number: 3306, protocol: 'tcp', service: 'mysql', status: 'open' }],
        metadata: { description: 'Database server storing application data' }
      });
    }

    // Create basic connections between entities
    const connections = [];
    if (entities.length >= 2) {
      connections.push({
        from: entities[0].hostname || '',
        to: entities[1].hostname || ''
      });
    }

    console.log('✅ Fallback parsing complete:', {
      entitiesGenerated: entities.length,
      connectionsGenerated: connections.length
    });

    return { entities, connections };
  }

  /**
   * Enhanced chat response using the chat model
   */
  public async generateChatResponse(userMessage: string, context?: any): Promise<string> {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    try {
      console.log('💬 Generating chat response', {
        requestId,
        messageLength: userMessage.length,
        timestamp: new Date().toISOString()
      });

      const chatModel = this.modelManager.getModel(ModelRole.CHAT);
      
      const systemMessage = `You are an intelligent infrastructure assistant helping users design, analyze, and understand IT infrastructure. 
      
You can help with:
- Explaining infrastructure components and their relationships
- Suggesting improvements to existing setups
- Answering questions about networks, servers, and security
- Providing guidance on best practices

Be helpful, concise, and technical when appropriate. If you need more context about the user's infrastructure, ask specific questions.`;

      const formattedPrompt = chatModel.promptFormatter.formatChatPrompt(systemMessage, userMessage);
      
      const result = await chatModel.llm.invoke(formattedPrompt);
      const rawResponse = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      const duration = Date.now() - startTime;
      
      const cleanedResponse = chatModel.responseParser.parseChatResponse(rawResponse);

      // Log the chat interaction
      this.logLLMInteraction(
        chatModel.name,
        'ollama', // Use hardcoded provider for now since ModelInstance doesn't have type
        formattedPrompt,
        rawResponse,
        'chat',
        duration,
        undefined,
        { requestId, userMessage: userMessage.substring(0, 100), context }
      );

      console.log('✅ Chat response generated successfully', {
        requestId,
        responseLength: cleanedResponse.length,
        duration: `${duration}ms`
      });

      return cleanedResponse;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log the failed chat attempt
      this.logLLMInteraction(
        'Unknown',
        'fallback',
        userMessage,
        '',
        'chat',
        duration,
        errorMessage,
        { requestId, fallback: true }
      );

      console.warn('⚠️ Chat model not configured, using fallback response', errorMessage);

      return "I'm here to help with your infrastructure! You can ask me to add components, update configurations, or describe your current setup. What would you like to work on?";
    }
  }

  /**
   * Create organization using the tools model
   */
  public async createRootOrganizationWithMemory(description: string): Promise<Partial<InfrastructureEntity>> {
    const similarCompanies = await this.searchCompaniesInMemory(description, 3);
    
    let orgName = "Organization";
    let businessDescription = description;
    let coreFunctions: string[] = [];
    let sectorTags: string[] = [];

    try {
      console.log(`🚀 Creating organization with tools model`);
      const toolsModel = this.modelManager.getModel(ModelRole.TOOLS);
      
      const schema = zodToJsonSchema(OrganizationProfileSchema);
      const instruction = "Generate a professional organization profile from the description. Exclude casual words like 'please', 'can', 'you', 'build', 'create'. Focus on business-appropriate naming and descriptions.";
      
      const formattedPrompt = toolsModel.promptFormatter.formatSystemPrompt(instruction, schema);
      const prompt = PromptTemplate.fromTemplate(formattedPrompt);
      
      const result = await toolsModel.llm.invoke(
        await prompt.format({ input: description })
      );

      const rawResponse = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      const parsed = toolsModel.responseParser.parseStructuredResponse(rawResponse, schema);
      const validated = OrganizationProfileSchema.parse(parsed);

      orgName = validated.name;
      businessDescription = validated.description;
      coreFunctions = validated.coreFunctions;
      sectorTags = this.generateSectorTags(validated.sector);
      
    } catch (error) {
      console.warn('⚠️ Tools model not configured, using fallback organization creation', error instanceof Error ? error.message : 'Unknown error');
      orgName = this.extractOrganizationName(description);
      businessDescription = this.extractBusinessDescription(description, orgName);
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
        processingMode: this.modelManager.getModelsInfo().tools?.processingMode || 'fallback'
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
        memoryEnhanced: true,
        processingMode: this.modelManager.getModelsInfo().tools?.processingMode || 'fallback'
      },
      position: { x: 400, y: 300 },
      connections: []
    };
  }

  /**
   * Enhanced entity description using tools model
   */
  public async enhanceEntityDescription(entity: InfrastructureEntity): Promise<string> {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    try {
      console.log('🔧 Enhancing entity description with tools model', {
        requestId,
        entityName: entity.name,
        entityType: entity.type
      });

      const toolsModel = this.modelManager.getModel(ModelRole.TOOLS);
      const schema = zodToJsonSchema(EntityDescriptionSchema);
      
      const instruction = `Generate a detailed technical description for this infrastructure component:
- Name: ${entity.name}
- Type: ${entity.type}
- Hostname: ${entity.hostname}
- Fidelity: ${entity.fidelity}`;

      const formattedPrompt = toolsModel.promptFormatter.formatSystemPrompt(instruction, schema);
      const prompt = PromptTemplate.fromTemplate(formattedPrompt);

      const result = await toolsModel.llm.invoke(
        await prompt.format({ input: `${entity.name} (${entity.type})` })
      );

      const rawResponse = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      const parsed = toolsModel.responseParser.parseStructuredResponse(rawResponse, schema);
      const validated = EntityDescriptionSchema.parse(parsed);

      console.log('✅ Entity description enhanced successfully', {
        requestId,
        descriptionLength: validated.description.length
      });

      return validated.description;

    } catch (error) {
      console.warn('⚠️ Tools model not configured, using fallback description', error instanceof Error ? error.message : 'Unknown error');

      return `${entity.type.replace('_', ' ')} component running on ${entity.hostname}`;
    }
  }

  // Helper methods for fallback processing
  private extractOrganizationName(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    // Look for explicit company name patterns
    const namedPatterns = [
      /(?:called|named)\s+([A-Za-z][A-Za-z0-9\s]*?)(?:\s+that|\s*$|\s+which|\s+with)/i,
      /(?:company|bank|firm|corp|corporation|inc|ltd|llc)\s+([A-Za-z][A-Za-z0-9\s]*?)(?:\s+that|\s*$|\s+which|\s+with)/i,
      /([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)\s+(?:bank|corp|company|firm|inc|ltd|llc)/i
    ];
    
    for (const pattern of namedPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim().replace(/[^a-zA-Z0-9\s]/g, '').trim();
      }
    }
    
    // Look for standalone capitalized words that might be company names
    const words = description.split(' ');
    const capitalizedWords = words.filter(word => 
      /^[A-Z][a-z]+/.test(word) && 
      !['Please', 'Create', 'Build', 'Make', 'Setup', 'Company', 'Bank', 'That', 'Has', 'A', 'The', 'And', 'With', 'For'].includes(word)
    );
    
    if (capitalizedWords.length > 0) {
      return capitalizedWords.slice(0, 2).join(' ');
    }
    
    // Fallback to sector-based naming
    if (lowerDesc.includes('bank')) return 'Financial Services Corp';
    if (lowerDesc.includes('tech')) return 'Technology Solutions Inc';
    if (lowerDesc.includes('health')) return 'Healthcare Systems Ltd';
    if (lowerDesc.includes('logistics')) return 'Logistics Partners LLC';
    
    return 'Business Enterprise';
  }

  private extractBusinessDescription(originalDescription: string, extractedName: string): string {
    const lowerDesc = originalDescription.toLowerCase();
    
    // Remove the company name and common prefixes from the description
    let cleanDesc = originalDescription
      .replace(new RegExp(extractedName, 'gi'), '')
      .replace(/^(please\s+)?(create|build|make|setup)\s+/i, '')
      .replace(/\s*(called|named)\s+[^,]*/i, '')
      .replace(/^\s*(a|an|the)\s+/i, '')
      .trim();
    
    // If we have "that has" or similar, extract what comes after
    const afterThat = cleanDesc.match(/(?:that|which)\s+(.+)/i);
    if (afterThat) {
      cleanDesc = afterThat[1];
    }
    
    // Generate a professional description based on sector
    let sectorDesc = '';
    if (lowerDesc.includes('bank') || lowerDesc.includes('financial')) {
      sectorDesc = 'A modern financial institution offering';
    } else if (lowerDesc.includes('tech') || lowerDesc.includes('software')) {
      sectorDesc = 'A technology company specializing in';
    } else if (lowerDesc.includes('health') || lowerDesc.includes('medical')) {
      sectorDesc = 'A healthcare organization providing';
    } else if (lowerDesc.includes('logistics') || lowerDesc.includes('delivery')) {
      sectorDesc = 'A logistics company focused on';
    } else {
      sectorDesc = 'A business organization specializing in';
    }
    
    // Clean up and format the extracted services/features
    if (cleanDesc) {
      cleanDesc = cleanDesc
        .replace(/^(has|have|offers|provides|with)\s+/i, '')
        .replace(/^(a|an)\s+/i, '')
        .trim();
      
      if (cleanDesc) {
        return `${sectorDesc} ${cleanDesc}.`;
      }
    }
    
    // Fallback descriptions
    if (lowerDesc.includes('bank')) {
      return 'A modern financial institution offering digital banking, payment processing, and financial services.';
    } else if (lowerDesc.includes('tech')) {
      return 'A technology company developing innovative software solutions and digital services.';
    } else if (lowerDesc.includes('health')) {
      return 'A healthcare organization providing medical services, patient care, and health management solutions.';
    } else if (lowerDesc.includes('logistics')) {
      return 'A logistics company specializing in supply chain management, delivery services, and transportation solutions.';
    }
    
    return 'A business organization providing professional services and solutions to clients.';
  }

  private extractCoreFunctions(description: string): string[] {
    const functions = [];
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('bank') || lowerDesc.includes('financial')) {
      functions.push('Banking Services', 'Financial Management', 'Customer Support');
    } else if (lowerDesc.includes('logistics') || lowerDesc.includes('delivery')) {
      functions.push('Logistics Management', 'Supply Chain', 'Delivery Services');
    } else if (lowerDesc.includes('tech') || lowerDesc.includes('software')) {
      functions.push('Software Development', 'Technical Support', 'System Management');
    } else {
      functions.push('Core Operations', 'Customer Service', 'Management');
    }
    
    return functions;
  }

  private extractSectorTags(description: string): string[] {
    const tags = [];
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('bank') || lowerDesc.includes('financial')) {
      tags.push('🏦 Banking', '💰 Finance');
    } else if (lowerDesc.includes('logistics') || lowerDesc.includes('delivery')) {
      tags.push('🚚 Logistics', '📦 Supply Chain');
    } else if (lowerDesc.includes('tech') || lowerDesc.includes('software')) {
      tags.push('💻 Technology', '⚙️ Software');
    } else if (lowerDesc.includes('defense') || lowerDesc.includes('security')) {
      tags.push('🛡️ Defense', '🔒 Security');
    } else {
      tags.push('🏢 Business', '⚡ Services');
    }
    
    return tags;
  }

  private generateSectorTags(sector: string): string[] {
    const sectorMap: Record<string, string[]> = {
      'banking': ['🏦 Banking', '💰 Finance', '💳 FinTech'],
      'technology': ['💻 Technology', '⚙️ Software', '🚀 Innovation'],
      'healthcare': ['🏥 Healthcare', '⚕️ Medical', '💊 Pharma'],
      'logistics': ['🚚 Logistics', '📦 Supply Chain', '🚛 Transport'],
      'defense': ['🛡️ Defense', '🔒 Security', '🎯 Military'],
      'public': ['🏢 Public Sector', '🏛️ Government', '👥 Civic'],
      'retail': ['🛒 Retail', '🛍️ Commerce', '💳 Sales'],
      'manufacturing': ['🏭 Manufacturing', '⚙️ Production', '🔧 Industrial']
    };
    
    const lowerSector = sector.toLowerCase();
    for (const [key, tags] of Object.entries(sectorMap)) {
      if (lowerSector.includes(key)) {
        return tags;
      }
    }
    
    return ['🏢 Business', '⚡ Services'];
  }
}
