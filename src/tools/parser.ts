import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { z } from 'zod';
import { 
  ToolActionSchema, 
  ToolAction, 
  ToolMetadata,
  CreateCompanySchema,
  GenerateApiSchema,
  LinkEntitiesSchema,
  ExpandInfrastructureSchema,
  SearchCompaniesSchema,
  ControlSimulationSchema,
  ModifyInfrastructureActionSchema
} from './schema';

export class StructuredToolParser {
  private parser: StructuredOutputParser<any>;
  private llm: ChatOllama;
  private parseChain: RunnableSequence<any, any>;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    // Create structured output parser from Zod schema
    this.parser = StructuredOutputParser.fromZodSchema(ToolActionSchema);
    
    // Initialize LLM with llama3-groq-tool-use model
    this.llm = new ChatOllama({
      baseUrl: ollamaBaseUrl,
      model: 'llama3-groq-tool-use',
      temperature: 0.1,
    });

    // Create the parsing chain
    this.parseChain = this.createParsingChain();
  }

  private createParsingChain(): RunnableSequence<any, any> {
    const prompt = PromptTemplate.fromTemplate(`
You are a JSON parser for infrastructure commands. Parse the user input and respond with valid JSON only.

RULES:
1. For adding/creating components: use "modifyInfrastructure" with operation "add"
2. For updating/changing properties: use "modifyInfrastructure" with operation "update" 
3. For removing/deleting: use "modifyInfrastructure" with operation "remove"
4. For connecting components: use "linkEntities"
5. For greetings/help: use "chat"

IMPORTANT: Always extract the component name if mentioned (e.g. "financial analytics", "UserDB", "load balancer")

User input: {input}

Respond with JSON only:
`);

    return RunnableSequence.from([
      prompt,
      this.llm,
      this.parser
    ]);
  }

  /**
   * Parse natural language input into structured tool action
   */
  async parseInput(input: string): Promise<{
    success: true;
    action: ToolAction;
    confidence: number;
  } | {
    success: false;
    error: string;
    fallback?: Partial<ToolAction>;
  }> {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log('🔧 Tool Parser Request [Structured Output + Zod]', {
      requestId,
      input,
      inputLength: input.length,
      model: 'llama3-groq-tool-use',
      timestamp: new Date().toISOString()
    });

    try {
      const startTime = Date.now();
      const result = await this.parseChain.invoke({ input });
      const duration = Date.now() - startTime;

      // Validate with Zod schema
      const validation = this.validateAction(result);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${(validation as { valid: false; errors: string[] }).errors.join(', ')}`);
      }

      console.log('✅ Tool Parser Success [Structured Output + Zod]', {
        requestId,
        action: result.action,
        parameters: Object.keys(result.parameters),
        duration: `${duration}ms`,
        validation: 'passed',
        timestamp: new Date().toISOString()
      });

      // Calculate confidence based on schema validation
      const confidence = this.calculateConfidence(result, input);
      return {
        success: true,
        action: result,
        confidence
      };

    } catch (error: any) {
      console.error('❌ Tool Parser Failed [Structured Output + Zod]', {
        requestId,
        error: error.message,
        input,
        timestamp: new Date().toISOString()
      });

      // Try to provide a fallback action based on keywords
      const fallback = this.generateFallback(input);
      return {
        success: false,
        error: error.message,
        fallback
      };
    }
  }

  /**
   * Calculate confidence score for parsed action
   */
  private calculateConfidence(action: ToolAction, originalInput: string): number {
    // Since we're using LLM-based parsing, base confidence on completeness of parsed data
    let confidence = 0.7; // Higher base confidence for LLM parsing
    
    // Boost confidence for specific operations with detailed parameters
    if (action.action === 'modifyInfrastructure') {
      const params = action.parameters;
      if (params.entity?.name) confidence += 0.1;
      if (params.entity?.ip) confidence += 0.1;
      if (params.entity?.type) confidence += 0.1;
      if (params.operation) confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate fallback action when parsing fails
   */
  private generateFallback(input: string): Partial<ToolAction> {
    // Always default to chat for graceful handling
    return {
      action: 'chat',
      parameters: {
        message: input,
        context: {
          topic: 'infrastructure'
        }
      }
    };
  }

  /**
   * Validate action before execution
   */
  validateAction(action: ToolAction): { valid: true } | { valid: false; errors: string[] } {
    try {
      ToolActionSchema.parse(action);
      return { valid: true };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return {
        valid: false,
        errors: [error.message || 'Unknown validation error']
      };
    }
  }

  /**
   * Get format instructions for the current schema
   */
  getFormatInstructions(): string {
    return this.parser.getFormatInstructions();
  }

  /**
   * Get available tool metadata
   */
  getAvailableTools(): typeof ToolMetadata {
    return ToolMetadata;
  }
}