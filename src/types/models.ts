// Shared types for model configuration (client-safe)
export enum ProcessingMode {
  LLAMA_CHAT = 'llama_chat',
  OPENAI_TOOLS = 'openai_tools',
  GROQ_TOOLS = 'groq_tools',
  STRUCTURED_OUTPUT = 'structured_output',
  AUTO_DETECT = 'auto_detect'
}

export enum ModelRole {
  CHAT = 'chat',
  TOOLS = 'tools'
}

export interface ModelConfig {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'local' | 'lambda';
  processingMode: ProcessingMode;
  requiresApiKey: boolean;
  requiresOllamaHost: boolean;
  description: string;
  recommendedFor?: ModelRole[];
}