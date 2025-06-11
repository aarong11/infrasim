import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ProcessingMode } from './langchain-orchestrator';

export interface ModelInstance {
  id: string;
  name: string;
  llm: ChatOllama;
  processingMode: ProcessingMode;
  promptFormatter: PromptFormatter;
  responseParser: ResponseParser;
}

export interface ModelConfig {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'anthropic';
  processingMode: ProcessingMode;
  baseUrl?: string;
  temperature?: number;
  description: string;
}

export interface PromptFormatter {
  formatSystemPrompt(instruction: string, schema?: any, examples?: string): string;
  formatChatPrompt(systemMessage: string, userMessage: string): string;
}

export interface ResponseParser {
  parseStructuredResponse(rawResponse: string, schema?: any): any;
  parseChatResponse(rawResponse: string): string;
}

// Llama-specific formatting
class LlamaPromptFormatter implements PromptFormatter {
  formatSystemPrompt(instruction: string, schema?: any, examples?: string): string {
    const schemaString = schema ? JSON.stringify(schema, null, 2)
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}') : '';
    
    const examplesString = examples ? examples
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}') : '';

    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert assistant that responds only with valid JSON matching the provided schema.

INSTRUCTION: ${instruction}

${schema ? `SCHEMA: ${schemaString}` : ''}

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

  formatChatPrompt(systemMessage: string, userMessage: string): string {
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${systemMessage}

<|eot_id|><|start_header_id|>user<|end_header_id|>

${userMessage}

<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;
  }
}

// Standard formatting for most models
class StandardPromptFormatter implements PromptFormatter {
  formatSystemPrompt(instruction: string, schema?: any, examples?: string): string {
    return `${instruction}

${schema ? `Schema: ${JSON.stringify(schema, null, 2)}` : ''}

${examples ? `Examples: ${examples}` : ''}

Input: {input}`;
  }

  formatChatPrompt(systemMessage: string, userMessage: string): string {
    return `System: ${systemMessage}

User: ${userMessage}`;
  }
}

// Enhanced JSON parser with retry logic
class LlamaResponseParser implements ResponseParser {
  parseStructuredResponse(rawResponse: string, schema?: any): any {
    return this.parseWithRetry(rawResponse);
  }

  parseChatResponse(rawResponse: string): string {
    return rawResponse
      .replace(/assistant<\|end_header_id\|>\s*\n*/g, '')
      .replace(/<\|eot_id\|>/g, '')
      .trim();
  }

  private parseWithRetry(content: string): any {
    const strategies = [
      // Strategy 1: Direct JSON parse
      () => JSON.parse(content),
      
      // Strategy 2: Extract JSON from markdown
      () => {
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        return jsonMatch ? JSON.parse(jsonMatch[1]) : null;
      },
      
      // Strategy 3: Find first valid JSON object
      () => {
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        }
        return null;
      }
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result) return result;
      } catch (error) {
        continue;
      }
    }

    throw new Error(`Failed to parse JSON from: ${content}`);
  }
}

// Standard response parser
class StandardResponseParser implements ResponseParser {
  parseStructuredResponse(rawResponse: string, schema?: any): any {
    try {
      return JSON.parse(rawResponse);
    } catch (error) {
      throw new Error(`Failed to parse structured response: ${rawResponse}`);
    }
  }

  parseChatResponse(rawResponse: string): string {
    return rawResponse.trim();
  }
}

export enum ModelRole {
  CHAT = 'chat',
  TOOLS = 'tools'
}

export class DualModelManager {
  private chatModel: ModelInstance | null = null;
  private toolsModel: ModelInstance | null = null;
  private defaultOllamaHost: string;

  constructor(ollamaHost: string = 'http://localhost:11434') {
    this.defaultOllamaHost = ollamaHost;
  }

  /**
   * Configure models for different roles
   */
  async configureModels(config: {
    chatModel: ModelConfig;
    toolsModel: ModelConfig;
    ollamaHost?: string;
  }): Promise<void> {
    const baseUrl = config.ollamaHost || this.defaultOllamaHost;

    // Initialize chat model
    this.chatModel = await this.createModelInstance(config.chatModel, baseUrl);
    
    // Initialize tools model
    this.toolsModel = await this.createModelInstance(config.toolsModel, baseUrl);

    console.log('✅ Dual model configuration complete', {
      chatModel: this.chatModel.name,
      toolsModel: this.toolsModel.name,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get model for specific role
   */
  getModel(role: ModelRole): ModelInstance {
    const model = role === ModelRole.CHAT ? this.chatModel : this.toolsModel;
    
    if (!model) {
      throw new Error(`No model configured for role: ${role}`);
    }
    
    return model;
  }

  /**
   * Get both models info
   */
  getModelsInfo(): { chat: ModelInstance | null; tools: ModelInstance | null } {
    return {
      chat: this.chatModel,
      tools: this.toolsModel
    };
  }

  /**
   * Switch a specific model
   */
  async switchModel(role: ModelRole, config: ModelConfig, ollamaHost?: string): Promise<void> {
    const baseUrl = ollamaHost || this.defaultOllamaHost;
    const newInstance = await this.createModelInstance(config, baseUrl);
    
    if (role === ModelRole.CHAT) {
      this.chatModel = newInstance;
    } else {
      this.toolsModel = newInstance;
    }

    console.log(`🔄 Model switched for ${role}`, {
      newModel: config.name,
      processingMode: config.processingMode
    });
  }

  private async createModelInstance(config: ModelConfig, baseUrl: string): Promise<ModelInstance> {
    const llm = new ChatOllama({
      baseUrl: config.baseUrl || baseUrl,
      model: config.id,
      temperature: config.temperature || 0.1,
    });

    // Choose formatter and parser based on processing mode first, then model name
    let formatter: PromptFormatter;
    let parser: ResponseParser;

    if (config.processingMode === ProcessingMode.OPENAI_TOOLS) {
      // Use standard formatting for OpenAI-style tools (including Groq)
      formatter = new StandardPromptFormatter();
      parser = new StandardResponseParser();
    } else if (config.id.includes('llama') || config.processingMode === ProcessingMode.LLAMA_CHAT) {
      // Use Llama-specific formatting for traditional Llama models
      formatter = new LlamaPromptFormatter();
      parser = new LlamaResponseParser();
    } else {
      // Default to standard formatting
      formatter = new StandardPromptFormatter();
      parser = new StandardResponseParser();
    }

    return {
      id: config.id,
      name: config.name,
      llm,
      processingMode: config.processingMode,
      promptFormatter: formatter,
      responseParser: parser
    };
  }
}