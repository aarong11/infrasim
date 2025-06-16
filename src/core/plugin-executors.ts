// Plugin Executors - Handles execution in different environments (server, browser, container)
import {
  IPluginExecutor,
  PluginDefinition,
  PluginExecutionRequest,
  PluginExecutionResult,
  ExecutionEnvironment,
  PluginSecurityContext
} from './plugin-system';
import { v4 as uuidv4 } from 'uuid';
import * as vm from 'vm';
import * as crypto from 'crypto';
import * as url from 'url';
import * as querystring from 'querystring';

// Pre-import allowed modules to avoid dynamic require() calls
const ALLOWED_MODULES = {
  'crypto': crypto,
  'url': url,
  'querystring': querystring,
  'vm': vm,
  'uuid': { v4: uuidv4 }
};

/**
 * Server-side plugin executor
 * Runs plugins in a sandboxed Node.js environment
 */
export class ServerPluginExecutor implements IPluginExecutor {
  private securityContext: PluginSecurityContext;

  constructor(securityContext?: Partial<PluginSecurityContext>) {
    this.securityContext = {
      allowedNetworkAccess: true,
      allowedFileSystemAccess: false,
      allowedEnvironmentVariables: ['NODE_ENV', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
      resourceLimits: {
        maxMemoryMB: 256,
        maxCpuPercent: 50,
        maxExecutionTimeMs: 30000
      },
      trustedDomains: ['localhost', '127.0.0.1'],
      ...securityContext
    };
  }

  canExecute(environment: ExecutionEnvironment): boolean {
    return environment === ExecutionEnvironment.SERVER;
  }

  getEnvironmentInfo() {
    return {
      environment: ExecutionEnvironment.SERVER,
      capabilities: ['nodejs', 'npm-packages', 'environment-variables', 'file-system-limited']
    };
  }

  async execute(plugin: PluginDefinition, request: PluginExecutionRequest): Promise<PluginExecutionResult> {
    const requestId = request.requestId || uuidv4();
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`Starting server execution for plugin: ${plugin.pluginName}`);
      
      // Validate parameters
      this.validateParameters(plugin, request.parameters);
      
      // Create sandboxed execution context
      const sandboxedFunction = this.createSandboxedFunction(plugin, logs);
      
      // Execute with timeout
      const result = await this.executeWithTimeout(
        sandboxedFunction,
        request.parameters,
        plugin.timeout || this.securityContext.resourceLimits.maxExecutionTimeMs
      );

      const duration = Date.now() - startTime;
      logs.push(`Server execution completed in ${duration}ms`);

      return {
        success: true,
        result,
        logs,
        duration,
        environment: ExecutionEnvironment.SERVER,
        requestId,
        timestamp: new Date(),
        metadata: {
          memoryUsed: process.memoryUsage().heapUsed,
          securityContext: this.securityContext
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logs.push(`Server execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs,
        duration,
        environment: ExecutionEnvironment.SERVER,
        requestId,
        timestamp: new Date()
      };
    }
  }

  private validateParameters(plugin: PluginDefinition, parameters: Record<string, any>): void {
    for (const [key, paramDef] of Object.entries(plugin.parameters)) {
      if (paramDef.required && !(key in parameters)) {
        throw new Error(`Required parameter missing: ${key}`);
      }
      
      if (key in parameters) {
        const value = parameters[key];
        const expectedType = paramDef.type;
        
        if (expectedType === 'string' && typeof value !== 'string') {
          throw new Error(`Parameter ${key} must be a string`);
        }
        if (expectedType === 'number' && typeof value !== 'number') {
          throw new Error(`Parameter ${key} must be a number`);
        }
        if (expectedType === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`Parameter ${key} must be a boolean`);
        }
      }
    }
  }

  private createSandboxedFunction(plugin: PluginDefinition, logs: string[]): Function {
    // Sandbox context with limited globals
    const sandbox = {
      console: {
        log: (...args: any[]) => logs.push(`[LOG] ${args.join(' ')}`),
        error: (...args: any[]) => logs.push(`[ERROR] ${args.join(' ')}`),
        warn: (...args: any[]) => logs.push(`[WARN] ${args.join(' ')}`)
      },
      require: (moduleName: string) => {
        // Only allow whitelisted modules using static imports
        const allowedModules = ['crypto', 'url', 'querystring', ...plugin.dependencies];
        if (!allowedModules.includes(moduleName)) {
          throw new Error(`Module not allowed: ${moduleName}`);
        }
        if (ALLOWED_MODULES[moduleName as keyof typeof ALLOWED_MODULES]) {
          return ALLOWED_MODULES[moduleName as keyof typeof ALLOWED_MODULES];
        }
        throw new Error(`Module not available: ${moduleName}`);
      },
      process: {
        env: this.getFilteredEnvironmentVariables()
      },
      setTimeout,
      clearTimeout,
      Buffer,
      JSON,
      Date,
      Math,
      Promise,
      fetch: typeof fetch !== 'undefined' ? fetch : undefined
    };

    // Compile the plugin code in the sandbox
    const script = new vm.Script(`
      ${plugin.inlineCode}
      
      // Extract the main function name from the code
      const functionMatch = \`${plugin.inlineCode}\`.match(/(?:async\\s+)?function\\s+(\\w+)/);
      const functionName = functionMatch ? functionMatch[1] : 'main';
      
      if (typeof eval(functionName) === 'function') {
        this.pluginFunction = eval(functionName);
      } else {
        throw new Error('No valid function found in plugin code');
      }
    `);

    const context = vm.createContext(sandbox);
    script.runInContext(context);
    
    return context.pluginFunction;
  }

  private getFilteredEnvironmentVariables(): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const key of this.securityContext.allowedEnvironmentVariables) {
      if (process.env[key]) {
        filtered[key] = process.env[key]!;
      }
    }
    return filtered;
  }

  private async executeWithTimeout(func: Function, parameters: Record<string, any>, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        const paramArray = Object.values(parameters);
        const result = func(...paramArray);
        
        if (result instanceof Promise) {
          result
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(timeoutId));
        } else {
          clearTimeout(timeoutId);
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
}

/**
 * Browser-side plugin executor
 * Runs plugins in Web Workers for isolation
 */
export class BrowserPluginExecutor implements IPluginExecutor {
  canExecute(environment: ExecutionEnvironment): boolean {
    return environment === ExecutionEnvironment.BROWSER && typeof window !== 'undefined';
  }

  getEnvironmentInfo() {
    return {
      environment: ExecutionEnvironment.BROWSER,
      capabilities: ['dom-manipulation', 'web-apis', 'local-storage', 'fetch']
    };
  }

  async execute(plugin: PluginDefinition, request: PluginExecutionRequest): Promise<PluginExecutionResult> {
    const requestId = request.requestId || uuidv4();
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`Starting browser execution for plugin: ${plugin.pluginName}`);

      // For DOM manipulation plugins, execute directly in main thread
      if (plugin.inlineCode.includes('document.')) {
        const result = await this.executeDOMPlugin(plugin, request.parameters, logs);
        const duration = Date.now() - startTime;
        
        return {
          success: true,
          result,
          logs,
          duration,
          environment: ExecutionEnvironment.BROWSER,
          requestId,
          timestamp: new Date()
        };
      }

      // For other plugins, use Web Worker for isolation
      const result = await this.executeInWebWorker(plugin, request.parameters, logs);
      const duration = Date.now() - startTime;

      return {
        success: true,
        result,
        logs,
        duration,
        environment: ExecutionEnvironment.BROWSER,
        requestId,
        timestamp: new Date()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logs.push(`Browser execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs,
        duration,
        environment: ExecutionEnvironment.BROWSER,
        requestId,
        timestamp: new Date()
      };
    }
  }

  private async executeDOMPlugin(plugin: PluginDefinition, parameters: Record<string, any>, logs: string[]): Promise<any> {
    // Extract function from plugin code and execute directly
    const functionMatch = plugin.inlineCode.match(/function\s+(\w+)/);
    const functionName = functionMatch ? functionMatch[1] : 'main';
    
    // Create function in current context
    const func = new Function('console', 'document', 'window', `
      const log = (...args) => console.log('[PLUGIN]', ...args);
      
      ${plugin.inlineCode}
      
      return ${functionName}(...arguments.slice(3));
    `);

    const consoleProxy = {
      log: (...args: any[]) => logs.push(`[LOG] ${args.join(' ')}`),
      error: (...args: any[]) => logs.push(`[ERROR] ${args.join(' ')}`),
      warn: (...args: any[]) => logs.push(`[WARN] ${args.join(' ')}`)
    };

    const paramArray = Object.values(parameters);
    return func(consoleProxy, document, window, ...paramArray);
  }

  private async executeInWebWorker(plugin: PluginDefinition, parameters: Record<string, any>, logs: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create Web Worker with plugin code
      const workerCode = `
        self.onmessage = function(e) {
          const { pluginCode, parameters } = e.data;
          
          try {
            // Execute plugin code
            eval(pluginCode);
            
            // Extract function name and execute
            const functionMatch = pluginCode.match(/function\\s+(\\w+)/);
            const functionName = functionMatch ? functionMatch[1] : 'main';
            
            if (typeof self[functionName] === 'function') {
              const result = self[functionName](...Object.values(parameters));
              self.postMessage({ success: true, result });
            } else {
              self.postMessage({ success: false, error: 'Function not found in plugin code' });
            }
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Plugin execution timeout after ${plugin.timeout || 30000}ms`));
      }, plugin.timeout || 30000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      };

      // Send plugin code and parameters to worker
      worker.postMessage({
        pluginCode: plugin.inlineCode,
        parameters
      });
    });
  }
}

/**
 * Container-based plugin executor
 * Runs plugins in isolated containers or serverless functions
 */
export class ContainerPluginExecutor implements IPluginExecutor {
  canExecute(environment: ExecutionEnvironment): boolean {
    return environment === ExecutionEnvironment.CONTAINER;
  }

  getEnvironmentInfo() {
    return {
      environment: ExecutionEnvironment.CONTAINER,
      capabilities: ['nodejs', 'npm-packages', 'network-access', 'external-apis']
    };
  }

  async execute(plugin: PluginDefinition, request: PluginExecutionRequest): Promise<PluginExecutionResult> {
    const requestId = request.requestId || uuidv4();
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`Starting container execution for plugin: ${plugin.pluginName}`);
      
      // For now, simulate container execution by running in current process
      // In production, this would create a Docker container or serverless function
      const result = await this.simulateContainerExecution(plugin, request.parameters, logs);
      const duration = Date.now() - startTime;

      return {
        success: true,
        result,
        logs,
        duration,
        environment: ExecutionEnvironment.CONTAINER,
        requestId,
        timestamp: new Date(),
        metadata: {
          containerId: `sim-${requestId}`,
          resourceUsage: 'simulated'
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logs.push(`Container execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs,
        duration,
        environment: ExecutionEnvironment.CONTAINER,
        requestId,
        timestamp: new Date()
      };
    }
  }

  private async simulateContainerExecution(plugin: PluginDefinition, parameters: Record<string, any>, logs: string[]): Promise<any> {
    // In a real implementation, this would:
    // 1. Create a container image with Node.js and required dependencies
    // 2. Inject the plugin code
    // 3. Execute with resource limits
    // 4. Return results via container stdout/API
    
    logs.push('Creating simulated container environment...');
    
    // Simulate network isolation and resource limits
    const sandbox = {
      require: (moduleName: string) => {
        if (plugin.dependencies.includes(moduleName)) {
          if (ALLOWED_MODULES[moduleName as keyof typeof ALLOWED_MODULES]) {
            return ALLOWED_MODULES[moduleName as keyof typeof ALLOWED_MODULES];
          }
        }
        throw new Error(`Module not available in container: ${moduleName}`);
      },
      process: {
        env: {} // Empty environment for security
      },
      console: {
        log: (...args: any[]) => logs.push(`[CONTAINER] ${args.join(' ')}`),
        error: (...args: any[]) => logs.push(`[CONTAINER-ERROR] ${args.join(' ')}`)
      }
    };

    // Execute plugin code with limited context
    const script = new vm.Script(`
      ${plugin.inlineCode}
      
      const functionMatch = \`${plugin.inlineCode}\`.match(/(?:async\\s+)?function\\s+(\\w+)/);
      const functionName = functionMatch ? functionMatch[1] : 'main';
      
      if (typeof eval(functionName) === 'function') {
        this.result = eval(functionName)(...arguments);
      } else {
        throw new Error('No valid function found in plugin code');
      }
    `);

    const context = vm.createContext(sandbox);
    script.runInContext(context, { timeout: plugin.timeout || 30000 });
    
    logs.push('Container execution completed');
    return context.result;
  }
}