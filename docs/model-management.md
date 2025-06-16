# Model Management & Prompt Engineering

## Overview

InfraSim's tool calling system features sophisticated model management that supports multiple LLM providers, dual-model configurations, and advanced prompt engineering techniques. This document covers how models are configured, managed, and optimized for different tasks.

## Multi-Provider Architecture

### 1. Supported Providers

The system supports four main LLM providers:

```typescript
interface ModelProvider {
  type: 'ollama' | 'openai' | 'anthropic' | 'lambda';
  baseUrl?: string;
  apiKey?: string;
  models: string[];
}
```

#### Provider Details:
- **Ollama**: Local models (nous-hermes2-mixtral, llama3.2)
- **OpenAI**: GPT-3.5/4 via direct API
- **Anthropic**: Claude models via direct API
- **Lambda Labs**: Llama-4-Maverick via custom proxy

### 2. Lambda Labs Proxy Integration

The system includes a custom proxy for Lambda Labs models:

```typescript
class LambdaProxyChatModel extends BaseChatModel {
  private getProxyUrl(): string {
    // Server-side: full URL, Client-side: relative URL
    return typeof window === 'undefined' 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/lambda-proxy`
      : '/api/lambda-proxy';
  }
}
```

**Key Features**:
- **SSR/Client Detection**: Handles both server and client-side requests
- **API Key Management**: Securely passes API keys through proxy
- **Error Handling**: Comprehensive error handling with fallbacks
- **Response Parsing**: Converts Lambda Labs responses to LangChain format

## Dual Model System

### 1. Model Roles

The system can use different models for different purposes:

```typescript
enum ModelRole {
  CHAT = 'chat',     // Conversational responses
  TOOLS = 'tools'    // Structured output parsing
}
```

**Benefits**:
- **Specialized Performance**: Use best model for each task
- **Cost Optimization**: Use cheaper models for simple tasks
- **Fallback Strategy**: Switch roles if one model fails

### 2. Model Manager

The `DualModelManager` coordinates multiple models:

```typescript
class DualModelManager {
  async configureModels(config: {
    chatModel: ModelConfig;
    toolsModel: ModelConfig;
    ollamaHost?: string;
  }): Promise<void>
  
  getModel(role: ModelRole): ModelInstance
  switchModel(role: ModelRole, config: ModelConfig): Promise<void>
}
```

### 3. Model Selection Strategy

The system automatically selects models based on:
- **User Configuration**: Explicitly set preferences
- **Task Requirements**: Structured output vs. conversational
- **Provider Availability**: API key availability and model access
- **Fallback Logic**: Graceful degradation when preferred models fail

## Prompt Engineering

### 1. Model-Specific Prompting

Different models require different prompt formats:

#### Llama Models (Chat Format)
```typescript
const llamaPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are an expert assistant that responds only with valid JSON.
INSTRUCTION: ${instruction}
SCHEMA: ${schema}
<|eot_id|><|start_header_id|>user<|end_header_id|>
${userInput}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;
```

#### OpenAI Models (Function Calling)
```typescript
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userInput }
];
```

#### Structured Output Parsing
```typescript
const structuredPrompt = `You must respond with ONLY valid JSON. No explanations, no markdown.
Parse the user input and respond with JSON matching this schema:
${JSON.stringify(schema, null, 2)}
User input: ${input}
Respond with JSON only:`;
```

### 2. Prompt Templates

The system uses different prompt templates for different tasks:

```typescript
class PromptTemplateManager {
  static createSystemPrompt(instruction: string, schema: any, examples?: string): string
  static createChatPrompt(systemMessage: string): string
  static createStructuredPrompt(schema: any, input: string): string
}
```

**Template Types**:
- **System Prompts**: Define agent behavior and capabilities
- **Chat Prompts**: Conversational interactions
- **Structured Prompts**: JSON output generation
- **Tool Prompts**: Function calling instructions

### 3. Context-Aware Prompting

Prompts are dynamically enhanced with context:

```typescript
const contextualPrompt = `
${basePrompt}

CURRENT CONTEXT:
- Mode: ${context.mode}
- Company: ${context.currentCompanyId ? company.name : 'None'}
- Infrastructure: ${infrastructureCount} components
- Chat History: ${chatHistory.length} messages

AVAILABLE ACTIONS:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}
`;
```

## Response Parsing & Validation

### 1. Multi-Strategy JSON Parsing

The system uses multiple strategies to extract JSON from LLM responses:

```typescript
class LlamaJsonParser {
  static parseWithRetry(jsonString: string): any {
    // Strategy 1: Direct parsing
    // Strategy 2: Extract from markdown code blocks
    // Strategy 3: Extract from assistant response format
    // Strategy 4: Find JSON-like structures
    // Strategy 5: Clean formatting issues
    // Strategy 6: Fix common JSON errors
  }
}
```

**Parsing Strategies**:
1. **Direct JSON.parse()**: For clean responses
2. **Markdown Extraction**: From ```json blocks
3. **Response Format Parsing**: From chat format responses
4. **Pattern Matching**: Find JSON in mixed content
5. **Cleanup Operations**: Remove prefixes/suffixes
6. **Error Correction**: Fix common JSON syntax issues

### 2. Schema Validation

All parsed responses are validated using Zod schemas:

```typescript
const validation = ToolActionSchema.safeParse(parsed);
if (!validation.success) {
  throw new Error(`Validation failed: ${validation.error.message}`);
}
```

### 3. Confidence Scoring

The system calculates confidence scores for parsed actions:

```typescript
private calculateConfidence(action: ToolAction, originalInput: string): number {
  let confidence = 0.7; // Base confidence for LLM parsing
  
  if (action.action === 'modifyInfrastructure') {
    const params = action.parameters;
    if (params.entity?.name) confidence += 0.1;
    if (params.entity?.ip) confidence += 0.1;
    if (params.entity?.type) confidence += 0.1;
    if (params.operation) confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
}
```

## Error Handling & Retry Logic

### 1. Retry Configuration

Models have configurable retry settings:

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2
};
```

### 2. Exponential Backoff

Failed requests use exponential backoff:

```typescript
const delay = Math.min(
  baseDelay * Math.pow(backoffMultiplier, attempt - 1),
  maxDelay
);
await new Promise(resolve => setTimeout(resolve, delay));
```

### 3. Fallback Chains

When models fail, the system cascades through fallbacks:

```typescript
// Primary: Lambda Labs Llama-4-Maverick
// Fallback 1: Ollama nous-hermes2-mixtral
// Fallback 2: OpenAI GPT-3.5 (if API key available)
// Fallback 3: Keyword-based parsing
// Fallback 4: Default chat response
```

## Performance Optimization

### 1. Model Caching

The system caches model instances:
- **LLM Instance Caching**: Reuse initialized models
- **Response Caching**: Cache similar prompts
- **Schema Caching**: Reuse compiled schemas

### 2. Prompt Optimization

Prompts are optimized for performance:
- **Length Optimization**: Minimize token usage
- **Template Reuse**: Cache compiled templates
- **Context Compression**: Summarize long contexts

### 3. Parallel Processing

Independent operations run in parallel:
- **Multi-model Queries**: Query different models simultaneously
- **Batch Processing**: Process multiple inputs together
- **Async Operations**: Non-blocking execution

## Configuration Management

### 1. Settings Service

Centralized configuration management:

```typescript
class SettingsService {
  static getSettings(): UserSettings {
    // Client-side: localStorage
    // Server-side: environment/defaults
  }
  
  static createLLMInstance(modelId: string, settings: UserSettings) {
    // Factory method for model creation
  }
}
```

### 2. Model Registry

All supported models are registered:

```typescript
private static modelRegistry: Record<string, ModelInfo> = {
  'llama-4-maverick-17b-128e-instruct-fp8': {
    id: 'llama-4-maverick-17b-128e-instruct-fp8',
    name: 'Llama 4 Maverick 17B (Lambda Labs)',
    type: 'lambda',
    processingMode: 'openai_tools',
    requiresApiKey: true,
    requiresOllamaHost: false
  },
  // ... other models
};
```

### 3. Dynamic Configuration

Configuration can be updated at runtime:
- **API Key Updates**: Refresh without restart
- **Model Switching**: Change models mid-session
- **Temperature Adjustment**: Fine-tune creativity
- **Host Configuration**: Update Ollama endpoints

## Monitoring & Observability

### 1. Model Performance Tracking

The system tracks model performance:

```typescript
interface ModelMetrics {
  requestCount: number;
  successRate: number;
  averageLatency: number;
  errorRates: Record<string, number>;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### 2. LLM Interaction Logging

All model interactions are logged:

```typescript
private logLLMInteraction(
  modelName: string,
  provider: string,
  prompt: string,
  response: string,
  type: 'chat' | 'tools' | 'parsing' | 'agent',
  duration?: number,
  error?: string,
  metadata?: Record<string, any>
)
```

### 3. Error Analytics

Detailed error tracking and analysis:
- **Error Classification**: Parse, validation, execution errors
- **Failure Patterns**: Common failure modes
- **Recovery Metrics**: Success rates of fallback strategies
- **Model Comparison**: Performance across different models

## Best Practices

### 1. Model Selection

- **Task Alignment**: Match model capabilities to task requirements
- **Cost Efficiency**: Use appropriate model size for complexity
- **Latency Requirements**: Consider response time needs
- **Reliability**: Factor in model availability and error rates

### 2. Prompt Design

- **Clarity**: Clear, unambiguous instructions
- **Examples**: Include relevant examples when needed
- **Constraints**: Specify output format requirements
- **Context**: Provide necessary context without overwhelming

### 3. Error Handling

- **Graceful Degradation**: Always provide fallback options
- **User Communication**: Inform users of limitations
- **Logging**: Comprehensive error tracking for debugging
- **Recovery**: Implement retry and alternative strategies

This model management system provides a robust foundation for handling diverse LLM providers while maintaining consistent performance and reliability across the tool calling architecture.