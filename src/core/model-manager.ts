import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ProcessingMode, ModelRole } from '../types/models';

// Export the shared types for other modules to use
export { ProcessingMode, ModelRole };

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

  _llmType(): string {
    return 'lambda-proxy';
  }

  _combineLLMOutput() {
    return [];
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

  async _generate(
    messages: BaseMessage[],
    options?: any,
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    try {
      // Log the Lambda API call attempt
      console.log('🔄 Lambda Labs API call attempt:', {
        modelName: this.modelName,
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0,
        apiKeyPrefix: this.apiKey?.substring(0, 10) + '...' || 'none',
        messagesCount: messages.length,
        timestamp: new Date().toISOString()
      });

      // Convert LangChain messages to OpenAI format
      const formattedMessages = messages.map(msg => ({
        role: msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content
      }));

      const proxyUrl = this.getProxyUrl();
      console.log(`🔄 Lambda proxy request to: ${proxyUrl}`);

      const requestBody = {
        apiKey: this.apiKey,
        model: this.modelName,
        messages: formattedMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };

      console.log('📤 Lambda proxy request body (sanitized):', {
        hasApiKey: !!requestBody.apiKey,
        apiKeyLength: requestBody.apiKey?.length || 0,
        model: requestBody.model,
        messagesCount: requestBody.messages.length,
        temperature: requestBody.temperature,
        max_tokens: requestBody.max_tokens
      });

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Lambda proxy response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Lambda proxy error response:', error);
        throw new Error(`Lambda proxy error: ${error.error}`);
      }

      const data = await response.json();
      console.log('✅ Lambda proxy success:', {
        hasChoices: !!data.choices,
        choicesCount: data.choices?.length || 0,
        contentLength: data.choices?.[0]?.message?.content?.length || 0,
        usage: data.usage
      });

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
      console.error('❌ Lambda proxy generate error:', error);
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

export interface ModelInstance {
  id: string;
  name: string;
  llm: ChatOllama | ChatOpenAI | LambdaProxyChatModel;
  processingMode: ProcessingMode;
  promptFormatter: PromptFormatter;
  responseParser: ResponseParser;
}

export interface ModelConfig {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'lambda';
  processingMode: ProcessingMode;
  baseUrl?: string;
  apiKey?: string;
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
    // Don't escape the schema since we're not using it in a template context here
    const schemaString = schema ? JSON.stringify(schema, null, 2) : '';
    const examplesString = examples || '';

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

// OpenAI/Lambda Labs formatting for standard chat models
class OpenAIPromptFormatter implements PromptFormatter {
  formatSystemPrompt(instruction: string, schema?: any, examples?: string): string {
    return `${instruction}
${schema ? `\nSchema: ${JSON.stringify(schema, null, 2)}` : ''}
${examples ? `\nExamples: ${examples}` : ''}

Input: {input}`;
  }

  formatChatPrompt(systemMessage: string, userMessage: string): string {
    // For OpenAI-style models, we'll use the system message directly
    // The actual formatting will be handled by the LangChain ChatOpenAI class
    return userMessage;
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
      .replace(/<\|eot_id|>/g, '')
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

export class DualModelManager {
  private chatModel: ModelInstance | null = null;
  private toolsModel: ModelInstance | null = null;
  private defaultOllamaHost: string;

  constructor(ollamaHost: string = 'http://ollama:11434') {
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
    let llm: ChatOllama | ChatOpenAI | LambdaProxyChatModel;

    // Log the model instance creation for debugging
    console.log('🏗️ Creating model instance:', {
      modelId: config.id,
      modelType: config.type,
      hasApiKey: !!config.apiKey,
      apiKeyLength: config.apiKey?.length || 0,
      temperature: config.temperature
    });

    if (config.type === 'lambda') {
      // Lambda Labs configuration using proxy to avoid CORS issues
      llm = new LambdaProxyChatModel({
        openAIApiKey: config.apiKey || '',
        modelName: config.id,
        temperature: config.temperature || 0.1,
        maxTokens: 2048,
      });
      
      console.log('🔧 Lambda model created with API key:', {
        hasApiKey: !!(config.apiKey || ''),
        apiKeyLength: (config.apiKey || '').length
      });
    } else if (config.type === 'openai') {
      // Standard OpenAI configuration
      llm = new ChatOpenAI({
        openAIApiKey: config.apiKey,
        modelName: config.id,
        temperature: config.temperature || 0.1,
        configuration: config.baseUrl ? {
          baseURL: config.baseUrl,
        } : undefined
      });
    } else {
      // Ollama configuration
      llm = new ChatOllama({
        baseUrl: config.baseUrl || baseUrl,
        model: config.id,
        temperature: config.temperature || 0.1,
      });
    }

    // Choose formatter and parser based on processing mode and model type
    let formatter: PromptFormatter;
    let parser: ResponseParser;

    if (config.type === 'lambda' || config.type === 'openai') {
      // OpenAI-style models support structured outputs and function calling natively
      formatter = new OpenAIPromptFormatter();
      parser = new StandardResponseParser();
    } else if (config.processingMode === ProcessingMode.OPENAI_TOOLS) {
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