// Plugin System - Core infrastructure for JSON-defined plugins with multi-environment execution
import { z } from 'zod';

// Execution environments for plugins
export enum ExecutionEnvironment {
  SERVER = 'server',
  BROWSER = 'browser', 
  CONTAINER = 'container'
}

// Plugin execution status
export enum PluginExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

// Parameter validation schema
export const PluginParameterSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  required: z.boolean().default(false),
  description: z.string().optional(),
  default: z.any().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.any()).optional()
  }).optional()
});

// Plugin definition schema
export const PluginDefinitionSchema = z.object({
  pluginName: z.string(),
  version: z.string().default('1.0.0'),
  description: z.string(),
  executionContext: z.nativeEnum(ExecutionEnvironment),
  parameters: z.record(PluginParameterSchema),
  inlineCode: z.string(),
  dependencies: z.array(z.string()).default([]),
  timeout: z.number().default(30000), // 30 seconds default timeout
  retries: z.number().default(0),
  metadata: z.record(z.any()).default({})
});

// Plugin execution request
export interface PluginExecutionRequest {
  pluginName: string;
  parameters: Record<string, any>;
  environment?: ExecutionEnvironment; // Override plugin's default environment
  requestId?: string;
  userId?: string;
  context?: Record<string, any>;
}

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

// Plugin execution context for tracking
export interface PluginExecutionContext {
  requestId: string;
  pluginName: string;
  status: PluginExecutionStatus;
  environment: ExecutionEnvironment;
  startTime: Date;
  endTime?: Date;
  logs: string[];
  result?: PluginExecutionResult;
}

// Type definitions
export type PluginDefinition = z.infer<typeof PluginDefinitionSchema>;
export type PluginParameter = z.infer<typeof PluginParameterSchema>;

// Plugin registry interface
export interface IPluginRegistry {
  registerPlugin(plugin: PluginDefinition): Promise<void>;
  getPlugin(name: string): Promise<PluginDefinition | null>;
  listPlugins(): Promise<PluginDefinition[]>;
  updatePlugin(name: string, plugin: PluginDefinition): Promise<void>;
  deletePlugin(name: string): Promise<void>;
}

// Plugin executor interface
export interface IPluginExecutor {
  execute(plugin: PluginDefinition, request: PluginExecutionRequest): Promise<PluginExecutionResult>;
  canExecute(environment: ExecutionEnvironment): boolean;
  getEnvironmentInfo(): { environment: ExecutionEnvironment; capabilities: string[] };
}

// Security context for plugin execution
export interface PluginSecurityContext {
  allowedNetworkAccess: boolean;
  allowedFileSystemAccess: boolean;
  allowedEnvironmentVariables: string[];
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuPercent: number;
    maxExecutionTimeMs: number;
  };
  trustedDomains: string[];
}

// Default plugins that come with the system
export const DEFAULT_PLUGINS: PluginDefinition[] = [
  {
    pluginName: 'sendEmail',
    version: '1.0.0',
    description: 'Send email notifications via SMTP',
    executionContext: ExecutionEnvironment.SERVER,
    parameters: {
      recipient: {
        type: 'string',
        required: true,
        description: 'Email recipient address'
      },
      subject: {
        type: 'string', 
        required: true,
        description: 'Email subject line'
      },
      body: {
        type: 'string',
        required: true,
        description: 'Email body content'
      },
      smtp: {
        type: 'object',
        required: false,
        description: 'SMTP configuration override'
      }
    },
    inlineCode: `
async function sendEmail(recipient, subject, body, smtp = null) {
  const nodemailer = require('nodemailer');
  
  const config = smtp || {
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };
  
  const transporter = nodemailer.createTransporter(config);
  
  const result = await transporter.sendMail({
    from: config.auth.user,
    to: recipient,
    subject: subject,
    html: body
  });
  
  return {
    success: true,
    messageId: result.messageId,
    timestamp: new Date().toISOString()
  };
}`,
    dependencies: ['nodemailer'],
    timeout: 10000
  },
  
  {
    pluginName: 'updateUI',
    version: '1.0.0', 
    description: 'Update UI elements in the browser',
    executionContext: ExecutionEnvironment.BROWSER,
    parameters: {
      selector: {
        type: 'string',
        required: true,
        description: 'CSS selector for target element'
      },
      content: {
        type: 'string',
        required: true,
        description: 'New content for the element'
      },
      animation: {
        type: 'string',
        required: false,
        description: 'Animation type (fade, slide, etc.)'
      }
    },
    inlineCode: `
function updateUI(selector, content, animation = 'none') {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(\`Element not found: \${selector}\`);
  }
  
  if (animation === 'fade') {
    element.style.opacity = '0';
    element.innerHTML = content;
    element.style.transition = 'opacity 0.3s';
    setTimeout(() => element.style.opacity = '1', 10);
  } else {
    element.innerHTML = content;
  }
  
  return {
    success: true,
    selector: selector,
    previousContent: element.getAttribute('data-previous-content') || '',
    timestamp: new Date().toISOString()
  };
}`,
    timeout: 5000
  },

  {
    pluginName: 'callExternalAPI',
    version: '1.0.0',
    description: 'Make secure API calls to external services',
    executionContext: ExecutionEnvironment.CONTAINER,
    parameters: {
      url: {
        type: 'string',
        required: true,
        description: 'API endpoint URL'
      },
      method: {
        type: 'string',
        required: false,
        default: 'GET',
        validation: {
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
        }
      },
      headers: {
        type: 'object',
        required: false,
        description: 'HTTP headers'
      },
      body: {
        type: 'object',
        required: false,
        description: 'Request body for POST/PUT requests'
      },
      timeout: {
        type: 'number',
        required: false,
        default: 10000,
        description: 'Request timeout in milliseconds'
      }
    },
    inlineCode: `
async function callExternalAPI(url, method = 'GET', headers = {}, body = null, timeout = 10000) {
  const fetch = require('node-fetch');
  const AbortController = require('abort-controller');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'InfraSim-Plugin/1.0',
        ...headers
      },
      signal: controller.signal
    };
    
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    const responseData = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}`,
    dependencies: ['node-fetch', 'abort-controller'],
    timeout: 30000
  }
];