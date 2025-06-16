# Tool Calling & Function Calling Architecture

## Overview

InfraSim implements a sophisticated tool calling and agent system that allows natural language commands to be parsed, validated, and executed as structured actions. The system supports multiple LLM providers (OpenAI, Anthropic, Ollama, Lambda Labs) and provides both agent-based and structured tool orchestration approaches.

## Architecture Components

### 1. Core Components

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Natural Language  │────▶│  Tool Parser/Agent  │────▶│   Tool Handlers     │
│     Input           │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                      │                           │
                                      ▼                           ▼
                            ┌─────────────────────┐     ┌─────────────────────┐
                            │   Schema Validation │     │  Action Execution   │
                            │   (Zod + LangChain) │     │                     │
                            └─────────────────────┘     └─────────────────────┘
```

### 2. Two Approaches to Tool Calling

#### A. Structured Tool Orchestrator (`/src/tools/`)
- **Purpose**: Direct keyword-based parsing with LLM enhancement
- **Best for**: Deterministic tool routing with fallback mechanisms
- **Components**:
  - `StructuredToolParser`: LLM-based parsing with Zod validation
  - `ToolHandlers`: Execution engine for validated actions
  - `StructuredToolOrchestrator`: Main coordinator

#### B. LangChain Agent (`/src/core/langchain-agent.ts`)
- **Purpose**: Native LangChain function calling with DynamicStructuredTool
- **Best for**: Complex reasoning and multi-step workflows
- **Components**:
  - `LangChainInfrastructureAgent`: Agent executor with tools
  - `DynamicStructuredTool`: Individual tool definitions with Zod schemas

## Tool Schema System

### Schema Definition (`/src/tools/schema.ts`)

All tools are defined using Zod schemas for type safety and validation:

```typescript
// Example: Company Creation Tool
export const CreateCompanySchema = z.object({
  action: z.literal('createCompany'),
  parameters: z.object({
    name: z.string().min(1, 'Company name is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    industry: z.enum(['banking', 'fintech', 'tech', 'healthcare', 'logistics', 'defense', 'retail', 'energy', 'manufacturing', 'telecom', 'public']),
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
    services: z.array(z.string()).min(1, 'At least one service is required'),
    // ... additional fields
  })
});
```

### Available Tools

1. **createCompany**: Create new companies with infrastructure
2. **generateApi**: Generate API specifications and endpoints
3. **linkEntities**: Connect infrastructure components
4. **expandInfrastructure**: Add components to existing infrastructure
5. **searchCompanies**: Query the vector database
6. **controlSimulation**: Manage simulation state
7. **modifyInfrastructure**: CRUD operations on infrastructure
8. **chat**: General conversation and help

### Union Schema

All tools are combined into a discriminated union for type safety:

```typescript
export const ToolActionSchema = z.discriminatedUnion('action', [
  CreateCompanySchema,
  GenerateApiSchema,
  LinkEntitiesSchema,
  ExpandInfrastructureSchema,
  SearchCompaniesSchema,
  ControlSimulationSchema,
  ModifyInfrastructureActionSchema,
  ChatActionSchema
]);
```

## Tool Parsing Pipeline

### 1. StructuredToolParser (`/src/tools/parser.ts`)

The parser converts natural language into structured tool actions:

```typescript
class StructuredToolParser {
  async parseInput(input: string): Promise<{
    success: true;
    action: ToolAction;
    confidence: number;
  } | {
    success: false;
    error: string;
    fallback?: Partial<ToolAction>;
  }>
}
```

#### Features:
- **Multi-model support**: OpenAI, Anthropic, Ollama, Lambda Labs
- **Structured output parsing**: Uses LangChain's StructuredOutputParser
- **Zod validation**: Ensures type safety and data integrity
- **Fallback mechanisms**: Graceful degradation when parsing fails
- **Configuration refresh**: Updates API keys and models dynamically

#### Parsing Process:
1. **Model Selection**: Uses user-configured tools model
2. **Prompt Construction**: Creates structured prompts for JSON output
3. **LLM Invocation**: Sends formatted prompt to selected model
4. **Response Parsing**: Extracts and validates JSON response
5. **Schema Validation**: Validates against Zod schemas
6. **Confidence Scoring**: Calculates parsing confidence

### 2. Model Management

The system supports multiple model configurations:

```typescript
interface ModelInfo {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'lambda';
  processingMode: string;
  requiresApiKey: boolean;
  requiresOllamaHost: boolean;
}
```

#### Supported Models:
- **Lambda Labs**: `llama-4-maverick-17b-128e-instruct-fp8`
- **Ollama**: `nous-hermes2-mixtral:latest`, `llama3.2:latest`
- **OpenAI**: `gpt-4`, `gpt-3.5-turbo`
- **Custom**: Via LambdaProxyChatModel for Lambda Labs integration

## Tool Execution System

### 1. ToolHandlers (`/src/tools/handlers.ts`)

The execution engine that performs the actual tool operations:

```typescript
class ToolHandlers {
  async executeAction(action: ToolAction, context?: AppContext): Promise<ToolExecutionResult>
}
```

#### Execution Flow:
1. **Context Setup**: Logs tool call to app store
2. **Action Routing**: Dispatches to appropriate handler method
3. **Implementation**: Executes business logic for the tool
4. **Result Formation**: Creates standardized result object
5. **Logging**: Updates tool call status and duration

#### Handler Methods:
- `handleCreateCompany`: Company creation with vector memory
- `handleGenerateApi`: API specification generation
- `handleLinkEntities`: Infrastructure connection management
- `handleExpandInfrastructure`: Component addition
- `handleSearchCompanies`: Vector database queries
- `handleControlSimulation`: Simulation state management
- `handleModifyInfrastructure`: CRUD operations
- `handleChat`: Conversational responses

### 2. Context Awareness

The system maintains context across interactions:

```typescript
interface AppContext {
  mode: 'infrastructure_management' | 'company_management' | 'api_management' | 'simulation_control' | 'general_assistance';
  viewState: any;
  currentCompanyId?: string;
  currentEntityId?: string;
}
```

This enables:
- **Mode-specific responses**: Tailored behavior based on current context
- **State persistence**: Maintains working context across tool calls
- **Smart defaults**: Uses context to provide intelligent parameter defaults

## LangChain Agent System

### 1. Agent Architecture (`/src/core/langchain-agent.ts`)

The LangChain-based agent provides advanced reasoning capabilities:

```typescript
class LangChainInfrastructureAgent {
  private tools: DynamicStructuredTool[];
  private llm: ChatOllama | ChatOpenAI | ChatAnthropic;
  private agent: any;
}
```

#### Agent Features:
- **Tool Discovery**: Automatically registers available tools
- **Intent Recognition**: Uses LLM reasoning for tool selection
- **Multi-step Workflows**: Can chain multiple tool calls
- **Error Recovery**: Handles failures gracefully
- **Intermediate Steps**: Provides visibility into reasoning process

### 2. Tool Registration

Tools are registered as `DynamicStructuredTool` instances:

```typescript
new DynamicStructuredTool({
  name: 'create_company',
  description: 'Create a new company with infrastructure simulation capabilities',
  schema: CreateCompanySchema,
  func: async (params) => {
    // Tool implementation
    return JSON.stringify(result);
  }
})
```

#### Tool Categories:
1. **Company Management**: Create, search, manage companies
2. **Infrastructure Management**: Add, modify, connect components
3. **Information Retrieval**: Get infrastructure layouts, descriptions
4. **Conversational**: General chat and help

### 3. Agent Execution

The agent processes commands through a simplified routing system:

```typescript
private async executeSimpleAgent(input: string): Promise<{
  output: string;
  intermediateSteps?: any[];
}> {
  // Keyword-based routing to appropriate tools
  // Fallback to conversational mode for unrecognized inputs
}
```

## Model Configuration System

### 1. Settings Service

Manages user preferences and API configurations:

```typescript
class SettingsService {
  static getSettings(): UserSettings
  static createLLMInstance(modelId: string, settings: UserSettings)
  static getModelInfo(modelId: string): ModelInfo | null
}
```

### 2. Dual Model Support

The system can use different models for different roles:
- **Chat Model**: Optimized for conversational responses
- **Tools Model**: Specialized for structured output parsing

### 3. Lambda Labs Integration

Custom proxy implementation for Lambda Labs models:

```typescript
class LambdaProxyChatModel extends BaseChatModel {
  // Proxy implementation that routes through /api/lambda-proxy
  // Handles API key management and request formatting
}
```

## Error Handling & Fallbacks

### 1. Graceful Degradation

The system provides multiple fallback layers:

1. **Parser Fallbacks**: When LLM parsing fails, uses keyword matching
2. **Model Fallbacks**: Falls back to default models when configured models fail
3. **Tool Fallbacks**: Provides default implementations when tools fail
4. **Response Fallbacks**: Context-aware default responses

### 2. Validation Pipeline

```typescript
// Schema validation with detailed error reporting
validateAction(action: ToolAction): { valid: true } | { valid: false; errors: string[] }

// Confidence scoring for parsed actions
calculateConfidence(action: ToolAction, originalInput: string): number
```

### 3. Retry Mechanisms

- **Exponential backoff** for failed LLM calls
- **Multiple parsing strategies** for JSON extraction
- **Model switching** on persistent failures

## Integration Points

### 1. Vector Memory Integration

Tools integrate with the vector database for:
- **Company search and retrieval**
- **Similarity matching**
- **Knowledge persistence**

### 2. Simulation Engine Integration

Tools can:
- **Control simulation state**
- **Add/modify infrastructure**
- **Monitor simulation metrics**

### 3. UI State Management

Tools update the global app store:
- **Tool call logging**
- **Agent workflow tracking**
- **Context state management**

## Usage Examples

### 1. Creating a Company

```typescript
// Natural language input
"Create a fintech company called PayTech that handles mobile payments"

// Parsed action
{
  action: 'createCompany',
  parameters: {
    name: 'PayTech',
    description: 'Fintech company handling mobile payments',
    industry: 'fintech',
    tags: ['fintech', 'payments', 'mobile'],
    services: ['Mobile Payments', 'Customer Support'],
    // ...
  }
}
```

### 2. Adding Infrastructure

```typescript
// Natural language input  
"Add a load balancer to the infrastructure"

// Parsed action
{
  action: 'modifyInfrastructure',
  parameters: {
    operation: 'add',
    entity: {
      type: 'load_balancer',
      name: 'Load Balancer',
      // ...
    }
  }
}
```

### 3. API Generation

```typescript
// Natural language input
"Generate a REST API for user management"

// Parsed action
{
  action: 'generateApi',
  parameters: {
    apiType: 'rest',
    serviceName: 'User Management API',
    endpoints: [
      { path: '/users', method: 'GET', description: 'Get all users' },
      { path: '/users', method: 'POST', description: 'Create user' },
      // ...
    ]
  }
}
```

## Configuration and Setup

### 1. Environment Variables

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
# API keys configured through UI settings
```

### 2. Model Configuration

Users can configure models through the settings interface:
- **API Keys**: OpenAI, Anthropic, Lambda Labs
- **Model Selection**: Per-role model assignment
- **Ollama Host**: Local Ollama server URL
- **Temperature**: Model creativity settings

### 3. Development Setup

```typescript
// Initialize the orchestrator
const orchestrator = new StructuredToolOrchestrator();
await orchestrator.initialize();

// Process commands
const result = await orchestrator.processCommand("Create a company called TechCorp");
```

This architecture provides a robust, extensible system for converting natural language into structured actions, with comprehensive error handling, multiple model support, and seamless integration with the broader InfraSim ecosystem.