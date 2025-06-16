// Dynamic Plugin Loader - Converts self-contained plugins into LangChain BaseTool instances
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import * as vm from 'vm';
import { ExecutionEnvironment } from './plugin-system';
import { ServerPluginExecutor, BrowserPluginExecutor, ContainerPluginExecutor } from './plugin-executors';
import { v4 as uuidv4 } from 'uuid';

// Plugin definition schema matching the example format
export const PluginDefinitionSchema = z.object({
  name: z.string().describe('Human-readable plugin name'),
  description: z.string().describe('Plugin description for LangChain agent'),
  executionContext: z.enum(['server', 'browser', 'container']).describe('Where the plugin should execute'),
  parameters: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    required: z.boolean().default(false),
    description: z.string().optional(),
    default: z.any().optional()
  })).optional().describe('Parameter schema'),
  code: z.string().describe('Plugin code as a string'),
  version: z.string().optional().default('1.0.0'),
  dependencies: z.array(z.string()).optional().default([]),
  timeout: z.number().optional().default(30000),
  metadata: z.record(z.any()).optional().default({})
});

export type PluginDefinition = z.infer<typeof PluginDefinitionSchema>;

// Plugin execution result
export interface PluginExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  logs: string[];
  duration: number;
  environment: ExecutionEnvironment;
  requestId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Dynamic Plugin Loader
 * Loads plugin definitions from JSON/TS files and converts them to LangChain tools
 */
export class DynamicPluginLoader {
  private plugins: Map<string, PluginDefinition> = new Map();
  private tools: Map<string, DynamicStructuredTool> = new Map();
  private executors: Map<ExecutionEnvironment, any> = new Map();
  private pluginDirectory: string;

  constructor(pluginDirectory: string = 'src/plugins') {
    this.pluginDirectory = pluginDirectory;
    
    // Initialize executors for different environments
    this.executors.set(ExecutionEnvironment.SERVER, new ServerPluginExecutor());
    this.executors.set(ExecutionEnvironment.BROWSER, new BrowserPluginExecutor());
    this.executors.set(ExecutionEnvironment.CONTAINER, new ContainerPluginExecutor());
  }

  /**
   * Load all plugins from the plugin directory
   */
  async loadPlugins(): Promise<DynamicStructuredTool[]> {
    console.log('🔌 Loading plugins from directory:', this.pluginDirectory);
    
    if (!existsSync(this.pluginDirectory)) {
      console.warn(`Plugin directory not found: ${this.pluginDirectory}`);
      return [];
    }

    const files = readdirSync(this.pluginDirectory).filter(file => 
      file.endsWith('.json') || file.endsWith('.ts') || file.endsWith('.js')
    );

    console.log(`📁 Found ${files.length} plugin files`);

    for (const file of files) {
      try {
        await this.loadPlugin(join(this.pluginDirectory, file));
      } catch (error) {
        console.error(`❌ Failed to load plugin from ${file}:`, error);
      }
    }

    return Array.from(this.tools.values());
  }

  /**
   * Load a single plugin from a file
   */
  private async loadPlugin(filePath: string): Promise<void> {
    const fileContent = readFileSync(filePath, 'utf-8');
    let pluginDef: any;

    if (filePath.endsWith('.json')) {
      pluginDef = JSON.parse(fileContent);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      // For TS/JS files, evaluate them in a sandbox to extract the plugin definition
      const sandbox: { module: { exports: any }, exports: any } = { 
        module: { exports: {} }, 
        exports: {} 
      };
      vm.createContext(sandbox);
      vm.runInContext(fileContent, sandbox);
      pluginDef = (sandbox.module.exports as any)?.default || sandbox.module.exports;
    }

    // Validate plugin definition
    const validated = PluginDefinitionSchema.parse(pluginDef);
    
    console.log(`✅ Loaded plugin: ${validated.name} v${validated.version} (${validated.executionContext})`);
    
    // Store plugin definition
    this.plugins.set(validated.name, validated);
    
    // Convert to LangChain tool
    const tool = this.createLangChainTool(validated);
    this.tools.set(validated.name, tool);
  }

  /**
   * Convert a plugin definition to a LangChain DynamicStructuredTool
   */
  private createLangChainTool(plugin: PluginDefinition): DynamicStructuredTool {
    // Create Zod schema from plugin parameters
    const schemaFields: Record<string, z.ZodType> = {};
    
    if (plugin.parameters) {
      for (const [key, param] of Object.entries(plugin.parameters)) {
        let zodType: z.ZodType;
        
        switch (param.type) {
          case 'string':
            zodType = z.string();
            break;
          case 'number':
            zodType = z.number();
            break;
          case 'boolean':
            zodType = z.boolean();
            break;
          case 'object':
            zodType = z.record(z.any());
            break;
          case 'array':
            zodType = z.array(z.any());
            break;
          default:
            zodType = z.any();
        }

        if (param.description) {
          zodType = zodType.describe(param.description);
        }

        if (!param.required) {
          zodType = zodType.optional();
        }

        if (param.default !== undefined) {
          zodType = zodType.default(param.default);
        }

        schemaFields[key] = zodType;
      }
    }

    const schema = z.object(schemaFields);

    return new DynamicStructuredTool({
      name: plugin.name.toLowerCase().replace(/\s+/g, '_'),
      description: plugin.description,
      schema,
      func: async (params: Record<string, any>) => {
        try {
          const result = await this.executePlugin(plugin, params);
          
          // Return structured result for LangChain
          return JSON.stringify({
            success: result.success,
            result: result.result,
            duration: result.duration,
            environment: result.environment,
            logs: result.logs.slice(-5), // Last 5 log entries
            timestamp: result.timestamp.toISOString()
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
    });
  }

  /**
   * Execute a plugin in the appropriate environment
   */
  private async executePlugin(plugin: PluginDefinition, parameters: Record<string, any>): Promise<PluginExecutionResult> {
    const requestId = uuidv4();
    const environment = this.mapExecutionContext(plugin.executionContext);
    const executor = this.executors.get(environment);

    if (!executor) {
      throw new Error(`No executor available for environment: ${environment}`);
    }

    // Convert plugin to the format expected by executors
    const pluginForExecution = {
      pluginName: plugin.name,
      version: plugin.version || '1.0.0',
      description: plugin.description,
      parameters: plugin.parameters || {},
      inlineCode: plugin.code,
      dependencies: plugin.dependencies || [],
      timeout: plugin.timeout || 30000,
      executionContext: environment,
      metadata: plugin.metadata || {}
    };

    const request = {
      requestId,
      parameters,
      context: {
        pluginName: plugin.name,
        version: plugin.version
      }
    };

    return await executor.execute(pluginForExecution, request);
  }

  /**
   * Map string execution context to enum
   */
  private mapExecutionContext(context: string): ExecutionEnvironment {
    switch (context.toLowerCase()) {
      case 'server':
        return ExecutionEnvironment.SERVER;
      case 'browser':
        return ExecutionEnvironment.BROWSER;
      case 'container':
        return ExecutionEnvironment.CONTAINER;
      default:
        return ExecutionEnvironment.SERVER;
    }
  }

  /**
   * Get all loaded tools for LangChain agent
   */
  getTools(): DynamicStructuredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): PluginDefinition | undefined {
    return this.plugins.get(name);
  }

  /**
   * Add a plugin dynamically
   */
  async addPlugin(plugin: PluginDefinition): Promise<DynamicStructuredTool> {
    const validated = PluginDefinitionSchema.parse(plugin);
    
    this.plugins.set(validated.name, validated);
    const tool = this.createLangChainTool(validated);
    this.tools.set(validated.name, tool);
    
    console.log(`🔌 Dynamically added plugin: ${validated.name}`);
    return tool;
  }

  /**
   * Get plugin execution statistics
   */
  getStats(): {
    totalPlugins: number;
    pluginsByEnvironment: Record<string, number>;
    pluginNames: string[];
  } {
    const pluginsByEnv: Record<string, number> = {};
    
    for (const plugin of this.plugins.values()) {
      pluginsByEnv[plugin.executionContext] = (pluginsByEnv[plugin.executionContext] || 0) + 1;
    }

    return {
      totalPlugins: this.plugins.size,
      pluginsByEnvironment: pluginsByEnv,
      pluginNames: Array.from(this.plugins.keys())
    };
  }
}