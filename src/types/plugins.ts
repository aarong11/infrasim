// Client-safe plugin types (extracted from core/plugin-system.ts)
export enum ExecutionEnvironment {
  SERVER = 'server',
  BROWSER = 'browser', 
  CONTAINER = 'container'
}

export enum PluginExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export interface PluginParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface PluginDefinition {
  pluginName: string;
  version: string;
  description: string;
  executionContext: ExecutionEnvironment;
  parameters: Record<string, PluginParameter>;
  inlineCode: string;
  dependencies: string[];
  timeout: number;
  retries: number;
  metadata: Record<string, any>;
}

export interface PluginExecutionContext {
  requestId: string;
  pluginName: string;
  status: PluginExecutionStatus;
  environment: ExecutionEnvironment;
  startTime: Date;
  endTime?: Date;
  logs: string[];
  result?: any;
}

export interface ToolExecutionMetadata {
  toolName: string;
  timestamp: Date;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  duration: number;
  environment: string;
  logs: string[];
  error?: string;
}