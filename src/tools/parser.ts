import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
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

// Settings service to read user configuration
interface UserSettings {
  chatModel: string;
  toolsModel: string;
  ollamaHost: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  lambdaApiKey: string;
  temperature: number;
  maxRetries: number;
}

interface ModelInfo {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'lambda';
  processingMode: string;
  requiresApiKey: boolean;
  requiresOllamaHost: boolean;
}

// Custom ChatOpenAI wrapper for Lambda Labs via proxy that extends BaseChatModel
class LambdaProxyChatModel extends BaseChatModel {
  private apiKey: string;
  private modelName: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: {
    openAIApiKey: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    super({});
    this.apiKey = config.openAIApiKey;
    this.modelName = config.modelName;
    this.temperature = config.temperature || 0.1;
    this.maxTokens = config.maxTokens || 2048;
  }

  private getProxyUrl(): string {
    // Check if we're running on the server-side
    if (typeof window === 'undefined') {
      // Server-side: use full URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return `${baseUrl}/api/lambda-proxy`;
    }
    // Client-side: use relative URL
    return '/api/lambda-proxy';
  }

  _llmType(): string {
    return 'lambda-proxy';
  }

  _combineLLMOutput() {
    return [];
  }

  async _generate(
    messages: BaseMessage[],
    options?: any,
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    try {
      // Convert LangChain messages to OpenAI format
      const formattedMessages = messages.map(msg => ({
        role: msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content
      }));

      const proxyUrl = this.getProxyUrl();
      console.log(`🔄 Lambda proxy request to: ${proxyUrl}`);

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          model: this.modelName,
          messages: formattedMessages,
          temperature: this.temperature,
          max_tokens: this.maxTokens
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Lambda proxy error: ${error.error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      return {
        generations: [{
          text: content,
          message: new AIMessage(content)
        }],
        llmOutput: {
          tokenUsage: data.usage || {}
        }
      };
    } catch (error) {
      console.error('Lambda proxy generate error:', error);
      throw error;
    }
  }

  async invoke(input: string | BaseMessage[]): Promise<any> {
    const messages = Array.isArray(input) ? input : [new HumanMessage(input)];
    const result = await this._generate(messages);
    return {
      content: result.generations[0]?.text || ''
    };
  }
}

class SettingsService {
  private static defaultSettings: UserSettings = {
    chatModel: 'llama-4-maverick-17b-128e-instruct-fp8',
    toolsModel: 'llama-4-maverick-17b-128e-instruct-fp8',
    ollamaHost: 'http://localhost:11434',
    openaiApiKey: '',
    anthropicApiKey: '',
    lambdaApiKey: '', // Removed default API key
    temperature: 0.1,
    maxRetries: 3
  };

  private static modelRegistry: Record<string, ModelInfo> = {
    'llama-4-maverick-17b-128e-instruct-fp8': {
      id: 'llama-4-maverick-17b-128e-instruct-fp8',
      name: 'Llama 4 Maverick 17B (Lambda Labs)',
      type: 'lambda',
      processingMode: 'openai_tools',
      requiresApiKey: true,
      requiresOllamaHost: false
    },
    'llama-3.1-8b-instruct': {
      id: 'llama-3.1-8b-instruct',
      name: 'Llama 3.1 8B Instruct (Lambda Labs)',
      type: 'lambda',
      processingMode: 'openai_tools',
      requiresApiKey: true,
      requiresOllamaHost: false
    },
    'nous-hermes2-mixtral:latest': {
      id: 'nous-hermes2-mixtral:latest',
      name: 'Nous Hermes 2 Mixtral',
      type: 'ollama',
      processingMode: 'openai_tools',
      requiresApiKey: false,
      requiresOllamaHost: true
    },
    'llama3.2:latest': {
      id: 'llama3.2:latest',
      name: 'Llama 3.2 Latest',
      type: 'ollama',
      processingMode: 'llama_chat',
      requiresApiKey: false,
      requiresOllamaHost: true
    },
    'gpt-4': {
      id: 'gpt-4',
      name: 'GPT-4',
      type: 'openai',
      processingMode: 'openai_tools',
      requiresApiKey: true,
      requiresOllamaHost: false
    }
  };

  static getSettings(): UserSettings {
    if (typeof window === 'undefined') {
      // Server-side: return defaults
      return this.defaultSettings;
    }
    
    try {
      const saved = localStorage.getItem('infrasim-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.defaultSettings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
    
    return this.defaultSettings;
  }

  static getModelInfo(modelId: string): ModelInfo | null {
    return this.modelRegistry[modelId] || null;
  }

  static createLLMInstance(modelId: string, settings: UserSettings) {
    const modelInfo = this.getModelInfo(modelId);
    if (!modelInfo) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    switch (modelInfo.type) {
      case 'lambda':
        // Use proxy instead of direct ChatOpenAI for Lambda Labs
        return new LambdaProxyChatModel({
          openAIApiKey: settings.lambdaApiKey,
          modelName: modelId,
          temperature: settings.temperature,
          maxTokens: 2048,
        });
      
      case 'openai':
        return new ChatOpenAI({
          openAIApiKey: settings.openaiApiKey,
          modelName: modelId,
          temperature: settings.temperature,
        });
      
      case 'ollama':
      default:
        return new ChatOllama({
          baseUrl: settings.ollamaHost,
          model: modelId,
          temperature: settings.temperature,
        });
    }
  }
}

export class StructuredToolParser {
  private parser: StructuredOutputParser<any>;
  private llm: ChatOllama | ChatOpenAI | LambdaProxyChatModel;
  private parseChain: RunnableSequence<any, any>;
  private currentModelId: string;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    // Create structured output parser from Zod schema
    this.parser = StructuredOutputParser.fromZodSchema(ToolActionSchema);
    
    // Initialize LLM based on user settings
    this.initializeLLMFromSettings();
    
    // Create the parsing chain
    this.parseChain = this.createParsingChain();
  }

  private initializeLLMFromSettings() {
    const settings = SettingsService.getSettings();
    
    // Use tools model for parsing
    this.currentModelId = settings.toolsModel;
    
    try {
      this.llm = SettingsService.createLLMInstance(this.currentModelId, settings);
      console.log(`🔧 Tool Parser initialized with model: ${this.currentModelId}`, {
        hasLambdaKey: !!settings.lambdaApiKey,
        lambdaKeyLength: settings.lambdaApiKey?.length || 0,
        modelType: SettingsService.getModelInfo(this.currentModelId)?.type || 'unknown'
      });
    } catch (error) {
      console.warn(`⚠️ Failed to initialize ${this.currentModelId}, falling back to default`);
      // Fallback to ChatOllama with nous-hermes2-mixtral
      this.llm = new ChatOllama({
        baseUrl: settings.ollamaHost,
        model: 'nous-hermes2-mixtral:latest',
        temperature: 0.1,
      });
      this.currentModelId = 'nous-hermes2-mixtral:latest';
    }
  }

  /**
   * Refresh LLM configuration - call this when settings change
   */
  public refreshConfiguration() {
    console.log('🔄 Refreshing Tool Parser configuration...');
    this.initializeLLMFromSettings();
    this.parseChain = this.createParsingChain();
  }

  private createParsingChain(): RunnableSequence<any, any> {
    const prompt = PromptTemplate.fromTemplate(`
You are a JSON-only response bot. You MUST respond with ONLY valid JSON that matches the schema below. Never include explanations, markdown, or any text outside the JSON.

SCHEMA RULES:
- For chat/conversation: use action "chat" 
- For adding infrastructure: use action "modifyInfrastructure" with operation "add"
- For updating/changing: use action "modifyInfrastructure" with operation "update" 
- For removing/deleting: use action "modifyInfrastructure" with operation "remove"
- For connecting components: use action "linkEntities"
- For creating companies: use action "createCompany"

IMPORTANT: Extract component names exactly as mentioned (e.g. "financial analytics", "UserDB", "load balancer")

Input: {input}

Valid JSON response (no markdown, no explanations):
`);

    return RunnableSequence.from([
      prompt,
      this.llm,
      {
        // Add a custom output parser that handles both structured and raw responses
        parse: (output: any) => {
          try {
            // If it's already parsed, return it
            if (typeof output === 'object' && output.action) {
              return output;
            }
            
            // Extract text content from different LLM response formats
            let textContent = '';
            if (typeof output === 'string') {
              textContent = output;
            } else if (output?.content) {
              textContent = output.content;
            } else if (output?.text) {
              textContent = output.text;
            } else if (output?.generations?.[0]?.text) {
              textContent = output.generations[0].text;
            } else {
              textContent = JSON.stringify(output);
            }
            
            // Clean up the response text
            textContent = textContent
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .replace(/^[^{]*/, '') // Remove anything before first {
              .replace(/[^}]*$/m, '}') // Remove anything after last }
              .trim();
            
            // If still empty or no JSON structure, return chat fallback immediately
            if (!textContent || !textContent.includes('{') || !textContent.includes('}')) {
              console.warn('No valid JSON structure found in output, using fallback');
              return {
                action: 'chat',
                parameters: {
                  message: 'I need more information to help you with that.',
                  context: { parseError: true, reason: 'no_json_structure' }
                }
              };
            }
            
            // Try to parse as JSON
            const parsed = JSON.parse(textContent);
            
            // Add detailed debug logging to see exactly what we got
            console.log('🔍 Detailed LLM Response Analysis:', {
              rawAction: parsed.action,
              actionType: typeof parsed.action,
              actionLength: parsed.action?.length,
              actionCharCodes: parsed.action && typeof parsed.action === 'string' 
                ? Array.from(parsed.action).map((c: string) => c.charCodeAt(0)) 
                : [],
              hasParameters: !!parsed.parameters,
              parametersKeys: parsed.parameters ? Object.keys(parsed.parameters) : [],
              fullParsed: JSON.stringify(parsed, null, 2)
            });
            
            // Validate the basic structure
            if (!parsed.action || !parsed.parameters) {
              throw new Error('Missing required fields: action and parameters');
            }
            
            // Clean the action string to remove any invisible characters or whitespace
            if (typeof parsed.action === 'string') {
              parsed.action = parsed.action.trim();
            }
            
            return parsed;
            
          } catch (error) {
            console.warn('Failed to parse LLM output, using fallback:', error);
            // Return a fallback chat action for any input that can't be parsed
            return {
              action: 'chat',
              parameters: {
                message: typeof output === 'string' && output.length > 0 ? output : 'I need more information to help you with that.',
                context: { parseError: true, originalError: error instanceof Error ? error.message : 'unknown' }
              }
            };
          }
        }
      }
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
    
    // Refresh configuration before each parse to ensure we have latest API keys
    this.refreshConfiguration();
    
    console.log('🔧 Tool Parser Request [Structured Output + Zod]', {
      requestId,
      input,
      inputLength: input.length,
      model: this.currentModelId,
      timestamp: new Date().toISOString()
    });

    try {
      const startTime = Date.now();
      
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Parser timeout after 30 seconds')), 30000);
      });
      
      const parsePromise = this.parseChain.invoke({ input });
      
      const result = await Promise.race([parsePromise, timeoutPromise]);
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
      // Silently fall back to chat for any parsing failures
      return {
        success: true,
        action: {
          action: 'chat',
          parameters: {
            message: input,
            context: {
              topic: 'infrastructure'
            }
          }
        },
        confidence: 0.5
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