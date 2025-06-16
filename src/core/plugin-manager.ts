// Plugin Manager - Main orchestrator for the plugin system with LLM enhancement
import {
  PluginDefinition,
  PluginExecutionRequest,
  PluginExecutionResult,
  PluginExecutionContext,
  PluginExecutionStatus,
  ExecutionEnvironment,
  IPluginExecutor
} from './plugin-system';
import { PluginRegistry } from './plugin-registry';
import {
  ServerPluginExecutor,
  BrowserPluginExecutor,
  ContainerPluginExecutor
} from './plugin-executors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main plugin manager that coordinates plugin execution across environments with LLM enhancement
 */
export class PluginManager {
  private registry: PluginRegistry;
  private executors: Map<ExecutionEnvironment, IPluginExecutor>;
  private activeExecutions: Map<string, PluginExecutionContext>;
  private executionHistory: PluginExecutionContext[];

  constructor() {
    this.registry = new PluginRegistry();
    this.executors = new Map();
    this.activeExecutions = new Map();
    this.executionHistory = [];

    // Initialize executors for each environment
    this.initializeExecutors();
  }

  private initializeExecutors(): void {
    this.executors.set(ExecutionEnvironment.SERVER, new ServerPluginExecutor());
    this.executors.set(ExecutionEnvironment.BROWSER, new BrowserPluginExecutor());
    this.executors.set(ExecutionEnvironment.CONTAINER, new ContainerPluginExecutor());
  }

  /**
   * Enhance plugin with LLM-driven modifications
   */
  async enhancePluginWithLLM(
    pluginName: string, 
    enhancementPrompt: string, 
    llmFunction?: (prompt: string) => Promise<string>
  ): Promise<PluginDefinition | null> {
    console.log(`🤖 Enhancing plugin ${pluginName} with LLM`);
    return await this.registry.enhancePluginWithLLM(pluginName, enhancementPrompt, llmFunction);
  }

  /**
   * Create a new plugin from LLM-generated definition with JSON storage
   */
  async createPluginFromLLM(definition: {
    name: string;
    description: string;
    code: string;
    environment: ExecutionEnvironment;
    parameters: Record<string, any>;
    category?: string;
    tags?: string[];
  }): Promise<void> {
    const plugin: PluginDefinition = {
      pluginName: definition.name,
      version: '1.0.0-llm-generated',
      description: definition.description,
      executionContext: definition.environment,
      parameters: this.convertLLMParametersToSchema(definition.parameters),
      inlineCode: definition.code,
      dependencies: this.extractDependenciesFromCode(definition.code),
      timeout: 30000,
      retries: 0,
      metadata: {
        generatedBy: 'LLM',
        createdAt: new Date().toISOString(),
        category: definition.category || 'general',
        tags: definition.tags || [],
        modifiable: true,
        llmEnhanced: false
      }
    };

    await this.registerPlugin(plugin);
    console.log(`🤖 LLM-generated plugin registered: ${definition.name}`);
  }

  /**
   * Parse and modify plugin code using LLM
   */
  async parseAndModifyPlugin(
    pluginName: string,
    modificationPrompt: string,
    llmFunction?: (prompt: string) => Promise<string>
  ): Promise<PluginDefinition | null> {
    const plugin = await this.registry.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    const analysisPrompt = `
Analyze and modify this plugin code:

Plugin: ${plugin.pluginName}
Current Code:
\`\`\`javascript
${plugin.inlineCode}
\`\`\`

Modification Request: ${modificationPrompt}

Please provide the modified JavaScript function code. Maintain the same function signature and ensure it returns a proper result object with success/error status.
`;

    let modifiedCode: string;
    if (llmFunction) {
      modifiedCode = await llmFunction(analysisPrompt);
    } else {
      // Fallback to basic modifications
      modifiedCode = this.applyBasicModifications(plugin.inlineCode, modificationPrompt);
    }

    // Extract function code
    const codeMatch = modifiedCode.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      modifiedCode = codeMatch[1];
    }

    const modifiedPlugin: PluginDefinition = {
      ...plugin,
      version: `${plugin.version}-modified-${Date.now()}`,
      inlineCode: modifiedCode,
      metadata: {
        ...plugin.metadata,
        llmEnhanced: true,
        modificationPrompt,
        modifiedAt: new Date().toISOString(),
        originalVersion: plugin.version
      }
    };

    await this.registerPlugin(modifiedPlugin);
    return modifiedPlugin;
  }

  private applyBasicModifications(originalCode: string, prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // Add timeout handling
    if (lowerPrompt.includes('timeout') || lowerPrompt.includes('time limit')) {
      return originalCode.replace(
        /^(async )?function\s+(\w+)/,
        `$1function $2WithTimeout`
      ).replace(
        /^(async )?function\s+(\w+WithTimeout)\s*\([^)]*\)\s*{/,
        `$1function $2(...args) {
  const startTime = Date.now();
  const TIMEOUT = 10000; // 10 second timeout
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Plugin execution timeout')), TIMEOUT);
  });
  
  const executionPromise = (async () => {`
      ).replace(/}$/, `
  })();
  
  return Promise.race([executionPromise, timeoutPromise]);
}`);
    }

    // Add input validation
    if (lowerPrompt.includes('validation') || lowerPrompt.includes('validate')) {
      return originalCode.replace(
        /^(async )?function\s+(\w+)\s*\([^)]*\)\s*{/,
        `$1function $2(...args) {
  // Input validation
  if (args.some(arg => arg === null || arg === undefined)) {
    return { success: false, error: 'Invalid input parameters', timestamp: new Date().toISOString() };
  }`
      );
    }

    return originalCode;
  }

  /**
   * Execute a plugin by name with parameters
   */
  async executePlugin(request: PluginExecutionRequest): Promise<PluginExecutionResult> {
    const requestId = request.requestId || uuidv4();
    
    console.log(`🔌 Executing plugin: ${request.pluginName}`, {
      requestId,
      parameters: Object.keys(request.parameters),
      environment: request.environment
    });

    try {
      // Get plugin definition
      const plugin = await this.registry.getPlugin(request.pluginName);
      if (!plugin) {
        throw new Error(`Plugin not found: ${request.pluginName}`);
      }

      // Determine execution environment
      const environment = request.environment || plugin.executionContext;
      const executor = this.getExecutor(environment);

      // Create execution context
      const context: PluginExecutionContext = {
        requestId,
        pluginName: request.pluginName,
        status: PluginExecutionStatus.PENDING,
        environment,
        startTime: new Date(),
        logs: []
      };

      this.activeExecutions.set(requestId, context);
      context.status = PluginExecutionStatus.RUNNING;

      // Execute plugin
      const result = await executor.execute(plugin, { ...request, requestId });
      
      // Update context
      context.status = result.success ? PluginExecutionStatus.COMPLETED : PluginExecutionStatus.ERROR;
      context.endTime = new Date();
      context.result = result;
      context.logs = result.logs;

      // Move to history
      this.activeExecutions.delete(requestId);
      this.executionHistory.push(context);

      console.log(`✅ Plugin execution completed: ${request.pluginName}`, {
        requestId,
        success: result.success,
        duration: result.duration,
        environment: result.environment
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update context for error
      const context = this.activeExecutions.get(requestId);
      if (context) {
        context.status = PluginExecutionStatus.ERROR;
        context.endTime = new Date();
        context.logs.push(`Error: ${errorMessage}`);
        
        this.activeExecutions.delete(requestId);
        this.executionHistory.push(context);
      }

      console.error(`❌ Plugin execution failed: ${request.pluginName}`, {
        requestId,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        logs: context?.logs || [],
        duration: context ? Date.now() - context.startTime.getTime() : 0,
        environment: request.environment || ExecutionEnvironment.SERVER,
        requestId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Auto-determine the best execution environment for a task
   */
  async executePluginAuto(pluginName: string, parameters: Record<string, any>, task?: string): Promise<PluginExecutionResult> {
    const plugin = await this.registry.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    // Determine environment based on task context
    let environment = plugin.executionContext;
    
    if (task) {
      environment = this.determineEnvironmentFromTask(task, plugin);
    }

    return this.executePlugin({
      pluginName,
      parameters,
      environment
    });
  }

  private determineEnvironmentFromTask(task: string, plugin: PluginDefinition): ExecutionEnvironment {
    const taskLower = task.toLowerCase();
    
    // UI-related tasks → Browser
    if (taskLower.includes('ui') || taskLower.includes('dom') || taskLower.includes('display') || taskLower.includes('show')) {
      return ExecutionEnvironment.BROWSER;
    }
    
    // External API calls → Container
    if (taskLower.includes('api') || taskLower.includes('external') || taskLower.includes('fetch') || taskLower.includes('http')) {
      return ExecutionEnvironment.CONTAINER;
    }
    
    // Database/file operations → Server
    if (taskLower.includes('database') || taskLower.includes('file') || taskLower.includes('email') || taskLower.includes('server')) {
      return ExecutionEnvironment.SERVER;
    }
    
    // Default to plugin's preferred environment
    return plugin.executionContext;
  }

  private getExecutor(environment: ExecutionEnvironment): IPluginExecutor {
    const executor = this.executors.get(environment);
    if (!executor) {
      throw new Error(`No executor available for environment: ${environment}`);
    }
    
    if (!executor.canExecute(environment)) {
      throw new Error(`Executor cannot handle environment: ${environment}`);
    }
    
    return executor;
  }

  /**
   * Register a new plugin
   */
  async registerPlugin(plugin: PluginDefinition): Promise<void> {
    await this.registry.registerPlugin(plugin);
  }

  /**
   * Get all available plugins
   */
  async getAvailablePlugins(): Promise<PluginDefinition[]> {
    return this.registry.listPlugins();
  }

  /**
   * Get plugins by environment
   */
  async getPluginsByEnvironment(environment: ExecutionEnvironment): Promise<PluginDefinition[]> {
    const allPlugins = await this.registry.listPlugins();
    return allPlugins.filter(plugin => plugin.executionContext === environment);
  }

  /**
   * Search plugins by query
   */
  async searchPlugins(query: string): Promise<PluginDefinition[]> {
    const allPlugins = await this.registry.listPlugins();
    const queryLower = query.toLowerCase();
    
    return allPlugins.filter(plugin => 
      plugin.pluginName.toLowerCase().includes(queryLower) ||
      plugin.description.toLowerCase().includes(queryLower) ||
      plugin.metadata?.tags?.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): PluginExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 50): PluginExecutionContext[] {
    return this.executionHistory
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Cancel an active execution
   */
  async cancelExecution(requestId: string): Promise<boolean> {
    const context = this.activeExecutions.get(requestId);
    if (!context) {
      return false;
    }

    context.status = PluginExecutionStatus.CANCELLED;
    context.endTime = new Date();
    context.logs.push('Execution cancelled by user');

    this.activeExecutions.delete(requestId);
    this.executionHistory.push(context);

    return true;
  }

  /**
   * Get system capabilities across all environments
   */
  getSystemCapabilities(): Record<ExecutionEnvironment, { available: boolean; capabilities: string[] }> {
    const capabilities: Record<ExecutionEnvironment, { available: boolean; capabilities: string[] }> = {} as any;

    for (const [env, executor] of this.executors) {
      const available = executor.canExecute(env);
      const info = executor.getEnvironmentInfo();
      
      capabilities[env] = {
        available,
        capabilities: info.capabilities
      };
    }

    return capabilities;
  }

  /**
   * Get plugin execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    successRate: number;
    avgDuration: number;
    byEnvironment: Record<ExecutionEnvironment, number>;
    byPlugin: Record<string, number>;
  } {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(e => e.status === PluginExecutionStatus.COMPLETED).length;
    const durations = this.executionHistory
      .filter(e => e.endTime)
      .map(e => e.endTime!.getTime() - e.startTime.getTime());
    
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const byEnvironment: Record<ExecutionEnvironment, number> = {} as any;
    const byPlugin: Record<string, number> = {};

    for (const execution of this.executionHistory) {
      byEnvironment[execution.environment] = (byEnvironment[execution.environment] || 0) + 1;
      byPlugin[execution.pluginName] = (byPlugin[execution.pluginName] || 0) + 1;
    }

    return {
      totalExecutions: total,
      successRate: total > 0 ? successful / total : 0,
      avgDuration,
      byEnvironment,
      byPlugin
    };
  }

  /**
   * Update plugin code at runtime (for LLM modifications)
   */
  async updatePluginCode(pluginName: string, newCode: string, version?: string): Promise<void> {
    const plugin = await this.registry.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    const updatedPlugin: PluginDefinition = {
      ...plugin,
      inlineCode: newCode,
      version: version || `${plugin.version}-modified-${Date.now()}`
    };

    await this.registry.updatePlugin(pluginName, updatedPlugin);
    
    console.log(`🔄 Plugin code updated: ${pluginName} v${updatedPlugin.version}`);
  }

  private convertLLMParametersToSchema(parameters: Record<string, any>): Record<string, any> {
    const schema: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        schema[key] = {
          type: 'string',
          required: true,
          description: `Parameter: ${key}`
        };
      } else if (typeof value === 'object' && value.type) {
        schema[key] = value;
      } else {
        schema[key] = {
          type: typeof value,
          required: false,
          description: `Auto-detected parameter: ${key}`
        };
      }
    }
    
    return schema;
  }

  private extractDependenciesFromCode(code: string): string[] {
    const requireMatches = code.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
    const dependencies = requireMatches.map(match => {
      const moduleMatch = match.match(/require\(['"`]([^'"`]+)['"`]\)/);
      return moduleMatch ? moduleMatch[1] : '';
    }).filter(dep => dep && !dep.startsWith('./') && !dep.startsWith('../'));
    
    return [...new Set(dependencies)]; // Remove duplicates
  }
}

// Global plugin manager instance
let globalPluginManager: PluginManager | null = null;

/**
 * Get or create the global plugin manager instance
 */
export function getPluginManager(): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager();
  }
  return globalPluginManager;
}