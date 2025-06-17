// Enhanced LangChain Agent with Dynamic Plugin Integration
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { DynamicPluginLoader, PluginDefinition } from './dynamic-plugin-loader';
import { z } from 'zod';
import { useAppStore } from '../store/app-store';

// Agent configuration
export interface AgentConfig {
  provider: 'ollama' | 'openai' | 'anthropic';
  modelName: string;
  ollamaBaseUrl?: string;
  apiKey?: string;
  temperature?: number;
  pluginDirectory?: string;
}

// Tool execution metadata for UI display
export interface ToolExecutionMetadata {
  toolName: string;
  parameters: Record<string, any>;
  result: any;
  duration: number;
  success: boolean;
  error?: string;
  environment: string;
  logs: string[];
  timestamp: Date;
}

/**
 * Enhanced LangChain Infrastructure Agent with Dynamic Plugin Support
 * Loads plugins dynamically and makes them available to the agent
 */
export class EnhancedLangChainAgent {
  private llm: ChatOllama | ChatOpenAI | ChatAnthropic;
  private pluginLoader: DynamicPluginLoader;
  private tools: DynamicStructuredTool[] = [];
  private toolExecutions: ToolExecutionMetadata[] = [];

  constructor(config: AgentConfig) {
    console.log('🚀 Initializing Enhanced LangChain Agent...', {
      provider: config.provider,
      model: config.modelName,
      timestamp: new Date().toISOString()
    });

    // Initialize LLM
    this.llm = this.initializeLLM(config);
    
    // Initialize plugin loader
    this.pluginLoader = new DynamicPluginLoader(config.pluginDirectory);
  }

  /**
   * Initialize the appropriate LLM based on provider
   */
  private initializeLLM(config: AgentConfig) {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    switch (config.provider) {
      case 'openai':
        return new ChatOpenAI({
          openAIApiKey: config.apiKey,
          modelName: config.modelName,
          temperature: config.temperature || 0.1,
        });
      
      case 'anthropic':
        return new ChatAnthropic({
          anthropicApiKey: config.apiKey,
          modelName: config.modelName,
          temperature: config.temperature || 0.1,
        });
      
      case 'ollama':
      default:
        return new ChatOllama({
          baseUrl: config.ollamaBaseUrl ||  ollamaBaseUrl,
          model: config.modelName,
          temperature: config.temperature || 0.1,
        });
    }
  }

  /**
   * Initialize the agent with dynamically loaded plugins
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Loading plugins and initializing agent...');
      
      // Load all plugins from the directory
      this.tools = await this.pluginLoader.loadPlugins();
      
      // Add core infrastructure tools
      this.tools.push(...this.createCoreTools());
      
      console.log(`📦 Loaded ${this.tools.length} tools total`);
      console.log('✅ Enhanced LangChain Agent initialized successfully');
      
      // Log plugin stats
      const stats = this.pluginLoader.getStats();
      console.log('📊 Plugin Statistics:', stats);
      
    } catch (error) {
      console.error('❌ Failed to initialize agent:', error);
      throw error;
    }
  }

  /**
   * Get the system prompt for the agent
   */
  private getSystemPrompt(): string {
    const pluginList = this.tools
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    return `You are an advanced infrastructure management assistant with access to a comprehensive plugin system.

Available Tools:
${pluginList}

Instructions:
1. Use the appropriate tools to accomplish user requests
2. For infrastructure tasks, use plugins that match the execution environment (server, browser, container)
3. Chain multiple tools when necessary to complete complex workflows
4. Always provide clear explanations of what tools you're using and why
5. Report tool execution results including duration and environment details
6. Handle errors gracefully and suggest alternatives when tools fail

You can create new companies, manage infrastructure, execute plugins, and handle complex multi-step workflows.
Be helpful, accurate, and efficient in your tool usage.`;
  }

  /**
   * Create core infrastructure management tools
   */
  private createCoreTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'add_plugin_dynamically',
        description: 'Add a new plugin to the system at runtime',
        schema: z.object({
          name: z.string().describe('Plugin name'),
          description: z.string().describe('Plugin description'),
          executionContext: z.enum(['server', 'browser', 'container']).describe('Execution environment'),
          code: z.string().describe('Plugin code'),
          parameters: z.record(z.any()).optional().describe('Parameter definitions')
        }),
        func: async (params) => {
          try {
            const plugin: PluginDefinition = {
              name: params.name,
              description: params.description,
              executionContext: params.executionContext,
              code: params.code,
              parameters: params.parameters || {},
              version: '1.0.0-dynamic'
            };

            const tool = await this.pluginLoader.addPlugin(plugin);
            this.tools.push(tool);

            return JSON.stringify({
              success: true,
              message: `Plugin '${params.name}' added successfully`,
              environment: params.executionContext
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
        name: 'list_available_plugins',
        description: 'List all available plugins and their capabilities',
        schema: z.object({
          environment: z.enum(['server', 'browser', 'container']).optional().describe('Filter by environment')
        }),
        func: async (params) => {
          const stats = this.pluginLoader.getStats();
          const plugins = this.tools
            .filter(tool => !params.environment || tool.name.includes(params.environment))
            .map(tool => ({
              name: tool.name,
              description: tool.description
            }));

          return JSON.stringify({
            success: true,
            totalPlugins: stats.totalPlugins,
            pluginsByEnvironment: stats.pluginsByEnvironment,
            availablePlugins: plugins
          });
        }
      }),

      new DynamicStructuredTool({
        name: 'get_tool_execution_history',
        description: 'Get the history of tool executions with performance metrics',
        schema: z.object({
          limit: z.number().optional().default(10).describe('Number of recent executions to return')
        }),
        func: async (params) => {
          const recent = this.toolExecutions
            .slice(-params.limit)
            .map(exec => ({
              tool: exec.toolName,
              success: exec.success,
              duration: exec.duration,
              environment: exec.environment,
              timestamp: exec.timestamp.toISOString(),
              error: exec.error
            }));

          return JSON.stringify({
            success: true,
            executions: recent,
            totalExecutions: this.toolExecutions.length
          });
        }
      })
    ];
  }

  /**
   * Simple tool routing and execution
   */
  private async routeAndExecuteTool(input: string): Promise<{
    output: string;
    toolExecutions: ToolExecutionMetadata[];
  }> {
    const inputLower = input.toLowerCase();
    const executedTools: ToolExecutionMetadata[] = [];

    // Handle common chat/greeting patterns first
    const chatPatterns = [
      'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'what can you do', 'help', 'what is this', 'explain',
      'thank you', 'thanks', 'bye', 'goodbye'
    ];

    const isChat = chatPatterns.some(pattern => inputLower.includes(pattern)) ||
                   inputLower.length < 10 || // Very short inputs are likely chat
                   inputLower.includes('?'); // Questions are likely chat

    if (isChat) {
      return {
        output: this.generateContextualChatResponse(input),
        toolExecutions: []
      };
    }

    // Try to match tools by keywords and execute them
    for (const tool of this.tools) {
      const toolNameWords = tool.name.toLowerCase().split('_');
      const descWords = tool.description.toLowerCase().split(' ');
      
      const hasMatchingKeywords = toolNameWords.some(word => 
        inputLower.includes(word) && word.length > 3
      ) || descWords.some(word => 
        inputLower.includes(word) && word.length > 4
      );

      if (hasMatchingKeywords) {
        try {
          console.log(`🔧 Executing tool: ${tool.name}`);
          const startTime = Date.now();
          
          // Extract parameters from input (simplified)
          const params = this.extractParametersFromInput(input, tool);
          
          const result = await tool.func(params);
          const duration = Date.now() - startTime;
          
          let parsedResult;
          try {
            parsedResult = JSON.parse(result);
          } catch {
            parsedResult = { success: true, message: result };
          }
          
          const execution: ToolExecutionMetadata = {
            toolName: tool.name,
            parameters: params,
            result: parsedResult,
            duration,
            success: parsedResult.success !== false,
            environment: this.getToolEnvironment(tool.name) || 'unknown',
            logs: [`Tool ${tool.name} executed successfully`],
            timestamp: new Date()
          };
          
          executedTools.push(execution);
          this.addToolExecution(execution);
          
          // Return after first successful tool execution
          return {
            output: `Successfully executed ${tool.name}: ${parsedResult.message || result}`,
            toolExecutions: executedTools
          };
          
        } catch (error) {
          const execution: ToolExecutionMetadata = {
            toolName: tool.name,
            parameters: {},
            result: null,
            duration: Date.now() - Date.now(),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            environment: this.getToolEnvironment(tool.name) || 'unknown',
            logs: [`Tool ${tool.name} failed: ${error}`],
            timestamp: new Date()
          };
          
          executedTools.push(execution);
          this.addToolExecution(execution);
          
          // Continue to try other tools instead of failing immediately
          console.warn(`Tool ${tool.name} failed, trying other tools...`);
        }
      }
    }

    // If no tools matched, use the LLM to generate a response with tool context
    try {
      const availableToolsContext = this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        environment: this.getToolEnvironment(tool.name) || 'unknown'
      }));

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an intelligent infrastructure management assistant. You have access to the following tools:

${availableToolsContext.map(tool => `• ${tool.name} (${tool.environment}): ${tool.description}`).join('\n')}

The user's request didn't match any specific tool patterns, so engage in helpful conversation while being aware of your capabilities. You can:
1. Discuss the available tools and how they might help
2. Suggest which tools might be relevant for different use cases
3. Provide general assistance and answer questions
4. Help users understand how to phrase requests to trigger specific tools

Be conversational, helpful, and knowledgeable about infrastructure management while showcasing your tool capabilities when relevant.`],
        ["human", input]
      ]);

      const chain = prompt.pipe(this.llm);
      const response = await chain.invoke({});
      
      // Safely extract string content from response
      let responseText: string;
      if (typeof response.content === 'string') {
        responseText = response.content;
      } else if (Array.isArray(response.content)) {
        // Handle complex content by extracting text parts
        responseText = response.content
          .map(part => {
            if (typeof part === 'string') {
              return part;
            } else if (part && typeof part === 'object' && 'text' in part) {
              return part.text || '';
            } else {
              return '';
            }
          })
          .join('');
      } else {
        responseText = "I'm here to help with infrastructure management. Feel free to ask me about the available tools or any infrastructure topics!";
      }
      
      return {
        output: responseText || "I'm here to help with infrastructure management. Feel free to ask me about the available tools or any infrastructure topics!",
        toolExecutions: executedTools
      };
    } catch (error) {
      console.error('LLM fallback failed:', error);
      return {
        output: "I understand your request, but I'm having trouble processing it right now. Could you try rephrasing or being more specific?",
        toolExecutions: executedTools
      };
    }
  }

  /**
   * Generate a contextual chat response for conversational inputs
   */
  private generateContextualChatResponse(input: string): string {
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('hello') || inputLower.includes('hi') || inputLower.includes('hey')) {
      return "Hello! I'm your infrastructure assistant. I can help you manage infrastructure, create companies, execute plugins, and handle various tasks. What would you like to work on?";
    }
    
    if (inputLower.includes('help') || inputLower.includes('what can you do')) {
      const availableTools = this.tools.slice(0, 5).map(t => `• ${t.name}: ${t.description}`).join('\n');
      return `I can help you with:\n\n${availableTools}\n\nJust tell me what you'd like to do in natural language!`;
    }
    
    if (inputLower.includes('thank')) {
      return "You're welcome! Is there anything else I can help you with?";
    }
    
    if (inputLower.includes('bye') || inputLower.includes('goodbye')) {
      return "Goodbye! Feel free to come back anytime you need help with infrastructure management.";
    }
    
    // Generic helpful response
    return "I'm here to help with infrastructure management tasks. You can ask me to create companies, manage infrastructure, execute plugins, or have a conversation about technical topics. What would you like to do?";
  }

  /**
   * Extract parameters from input for a given tool (simplified)
   */
  private extractParametersFromInput(input: string, tool: DynamicStructuredTool): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Simple parameter extraction based on common patterns
    if (tool.name.includes('notification')) {
      const messageMatch = input.match(/"([^"]+)"/);
      if (messageMatch) params.message = messageMatch[1];
      
      if (input.includes('success')) params.type = 'success';
      else if (input.includes('error')) params.type = 'error';
      else if (input.includes('warning')) params.type = 'warning';
      
      const durationMatch = input.match(/(\d+)\s*seconds?/);
      if (durationMatch) params.duration = parseInt(durationMatch[1]) * 1000;
    }
    
    if (tool.name.includes('email')) {
      const emailMatch = input.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) params.to = emailMatch[1];
      
      const subjectMatch = input.match(/subject\s+"([^"]+)"/i);
      if (subjectMatch) params.subject = subjectMatch[1];
      
      const bodyMatch = input.match(/body\s+"([^"]+)"/i);
      if (bodyMatch) params.body = bodyMatch[1];
    }
    
    if (tool.name.includes('summarize')) {
      const urlMatch = input.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) params.url = urlMatch[1];
      
      const lengthMatch = input.match(/(\d+)\s*words?/);
      if (lengthMatch) params.maxLength = parseInt(lengthMatch[1]);
    }
    
    return params;
  }

  /**
   * Execute a command using simple tool routing
   */
  async executeCommand(input: string): Promise<{
    output: string;
    intermediateSteps?: any[];
    toolExecutions: ToolExecutionMetadata[];
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
      const initialExecutionCount = this.toolExecutions.length;
      const result = await this.routeAndExecuteTool(input);
      const duration = Date.now() - startTime;
      
      // Get tool executions from this command
      const newExecutions = this.toolExecutions.slice(initialExecutionCount);
      
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
          toolsUsed: newExecutions.map(e => e.toolName),
          toolExecutions: newExecutions.length
        }
      );
      
      // Update UI with tool execution status
      this.updateUIWithToolExecutions(newExecutions);
      
      console.log('✅ Agent command completed', {
        requestId,
        duration: `${duration}ms`,
        toolsExecuted: newExecutions.length,
        timestamp: new Date().toISOString()
      });

      return {
        output: result.output,
        toolExecutions: result.toolExecutions
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
        error: errorMessage,
        toolExecutions: []
      };
    }
  }

  /**
   * Get provider name for logging
   */
  private getProviderName(): string {
    if (this.llm instanceof ChatOllama) {
      return 'ollama';
    } else if (this.llm.constructor.name.includes('OpenAI')) {
      return 'openai';
    } else if (this.llm.constructor.name.includes('Anthropic')) {
      return 'anthropic';
    }
    return 'unknown';
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
   * Update UI with tool execution details
   */
  private updateUIWithToolExecutions(executions: ToolExecutionMetadata[]) {
    if (typeof window !== 'undefined') {
      try {
        const { addLog } = useAppStore.getState();
        
        executions.forEach(execution => {
          addLog({
            modelName: 'Plugin System',
            provider: 'infrasim',
            prompt: `Tool: ${execution.toolName}`,
            response: execution.success ? 'Success' : (execution.error || 'Failed'),
            type: 'agent',
            duration: execution.duration,
            error: execution.error,
            metadata: {
              toolName: execution.toolName,
              environment: execution.environment,
              parameters: execution.parameters,
              result: execution.result,
              logs: execution.logs
            }
          });
        });
      } catch (err) {
        console.warn('Failed to update UI with tool executions:', err);
      }
    }
  }

  /**
   * Add a tool execution record
   */
  addToolExecution(metadata: ToolExecutionMetadata) {
    this.toolExecutions.push(metadata);
    
    // Keep only the last 100 executions to prevent memory issues
    if (this.toolExecutions.length > 100) {
      this.toolExecutions = this.toolExecutions.slice(-100);
    }
  }

  /**
   * Get available tools information
   */
  getAvailableTools(): Array<{
    name: string;
    description: string;
    environment?: string;
  }> {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      environment: this.getToolEnvironment(tool.name)
    }));
  }

  /**
   * Get the execution environment for a tool
   */
  private getToolEnvironment(toolName: string): string | undefined {
    const plugin = this.pluginLoader.getPlugin(toolName);
    return plugin?.executionContext;
  }

  /**
   * Get plugin statistics
   */
  getPluginStats() {
    return this.pluginLoader.getStats();
  }

  /**
   * Stream tool output (for future streaming support)
   */
  async *streamCommand(input: string): AsyncGenerator<{
    type: 'tool_start' | 'tool_end' | 'thought' | 'final';
    content: any;
  }> {
    // This is a placeholder for future streaming implementation
    // For now, just yield the final result
    const result = await this.executeCommand(input);
    yield { type: 'final', content: result };
  }
}