# InfraSim - Infrastructure Simulation Platform Documentation

## Overview

InfraSim is a sophisticated infrastructure simulation platform that uses Large Language Models (LLMs) and vector databases to create, manage, and simulate complex infrastructure environments. The platform leverages structured tool calling, vector memory management, and real-time API generation capabilities.

## Architecture Overview

### Core Components

1. **LangChain Orchestrator** - Core LLM integration and structured output parsing
2. **Vector Memory Manager** - Company data storage and semantic search
3. **Structured Tool System** - Natural language command processing
4. **Simulation Engine** - Infrastructure entity simulation and management
5. **OpenAPI Stub Generator** - Dynamic API specification generation

---

## API Endpoints

### Next.js API Routes

#### `/api/vector-memory` (Route Handler)
- **File**: `src/app/api/vector-memory/route.ts`
- **Methods**: GET, POST, DELETE
- **Purpose**: Vector database operations for company records
- **Authentication**: None (development)
- **Rate Limiting**: None implemented

**GET** - Retrieve companies
```typescript
// Query parameters: ?query=string&limit=number
Response: { companies: CompanyMemoryRecord[] }
```

**POST** - Add company
```typescript
Request: CompanyMemoryRecord
Response: { success: boolean, id: string }
```

**DELETE** - Clear all companies
```typescript
Response: { success: boolean, message: string }
```

### Internal Service APIs

#### Infrastructure Simulation APIs
- **Health Check**: `/health` - Basic service status
- **Status**: `/status` - Detailed service information
- **Entity Management**: Dynamic endpoints based on entity configuration

---

## Large Language Model (LLM) Integration

### 1. LangChain Orchestrator (`src/core/langchain-orchestrator.ts`)

**Model**: `smangrul/llama-3-8b-instruct-function-calling` (Ollama)
**Base URL**: `http://localhost:11434` (configurable)

#### LLM Usage Patterns:

**Infrastructure Parsing**
```typescript
// Parses natural language descriptions into structured infrastructure
async parseInfrastructureDescription(description: string): Promise<ParsedInfrastructure>
```

**Organization Profile Generation**
```typescript
// Creates company profiles from descriptions
async createRootOrganizationWithMemory(description: string): Promise<Partial<InfrastructureEntity>>
```

**Entity Description Enhancement**
```typescript
// Enhances infrastructure entity descriptions
async enhanceEntityDescription(entity: InfrastructureEntity): Promise<string>
```

### 2. Structured Tool Parser (`src/tools/parser.ts`)

**Model**: `smangrul/llama-3-8b-instruct-function-calling`
**Purpose**: Natural language command parsing into structured tool actions

```typescript
// Parses natural language into tool actions
async parseInput(input: string): Promise<ToolParseResult>
```

### 3. Company Profile Generator (`src/modules/companies-house/CompanyProfileGenerator.ts`)

**Model**: `smangrul/llama-3-8b-instruct-function-calling`
**Purpose**: Generate realistic company profiles

```typescript
// Generates comprehensive company profiles
async generateCompanyProfile(name: string, description: string): Promise<CompanyProfile>
```

### 4. Infrastructure Builder (`src/modules/companies-house/InfrastructureBuilder.ts`)

**Model**: `smangrul/llama-3-8b-instruct-function-calling`
**Purpose**: Generate infrastructure topologies and OpenAPI specifications

```typescript
// Builds infrastructure from company profiles
async buildInfrastructure(companyProfile: CompanyProfile, targetCount: number): Promise<InfrastructureEntity[]>

// Generates OpenAPI specifications
private async generateOpenApiStub(serviceName: string, serviceDescription: string): Promise<string>
```

---

## Schema Enforcement

### 1. Zod Schema Definitions

#### Core Infrastructure Schemas (`src/core/langchain-orchestrator.ts`)

```typescript
// Infrastructure entity validation
const InfrastructureEntitySchema = z.object({
  name: z.string().describe('Entity name'),
  type: z.enum(['dns_server', 'ntp_server', 'web_app', 'database', 'firewall', 'load_balancer', 'social_agent', 'api_service']),
  hostname: z.string().describe('Hostname'),
  ports: z.array(z.object({
    number: z.number().int().min(1).max(65535),
    protocol: z.enum(['tcp', 'udp']),
    service: z.string(),
    status: z.enum(['open', 'closed', 'filtered']).default('open')
  })),
  metadata: z.object({
    description: z.string().optional()
  }).optional()
});

// Organization profile validation
const OrganizationProfileSchema = z.object({
  name: z.string().describe('Company/organization name'),
  description: z.string().describe('Professional business description'),
  sector: z.string().describe('Business sector'),
  coreFunctions: z.array(z.string()).min(3).max(5).describe('Core business functions')
});
```

#### Tool Action Schemas (`src/tools/schema.ts`)

**Create Company Schema**
```typescript
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

**Generate API Schema**
```typescript
export const GenerateApiSchema = z.object({
  action: z.literal('generateApi'),
  parameters: z.object({
    companyId: z.string().uuid(),
    apiType: z.enum(['rest', 'graphql', 'grpc', 'websocket']).default('rest'),
    serviceName: z.string().min(1, 'Service name is required'),
    endpoints: z.array(z.object({
      path: z.string(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      description: z.string(),
      requestBody: z.record(z.any()).optional(),
      responseBody: z.record(z.any()).optional()
    })),
    authentication: z.enum(['none', 'apikey', 'oauth2', 'jwt', 'basic']).default('apikey'),
    rateLimit: z.number().int().positive().optional()
  })
});
```

#### Infrastructure Builder Schemas (`src/modules/companies-house/InfrastructureBuilder.ts`)

```typescript
// Infrastructure topology validation
const InfrastructureTopologySchema = z.object({
  components: z.array(InfrastructureComponentSchema).min(1),
  connections: z.array(z.object({
    from: z.string().describe('Source component ID'),
    to: z.string().describe('Target component ID')
  }))
});

// OpenAPI specification validation
const OpenApiSpecSchema = z.object({
  openapi: z.literal('3.0.0'),
  info: z.object({
    title: z.string(),
    version: z.string(),
    description: z.string()
  }),
  paths: z.record(z.any()).describe('API endpoints')
});
```

### 2. Structured Output Parsers

#### Implementation Pattern
```typescript
// All LLM interactions use structured output parsers
this.infrastructureParser = StructuredOutputParser.fromZodSchema(ParsedInfrastructureSchema);
this.organizationParser = StructuredOutputParser.fromZodSchema(OrganizationProfileSchema);
this.descriptionParser = StructuredOutputParser.fromZodSchema(EntityDescriptionSchema);
```

#### Schema-to-JSON Conversion
```typescript
// Automatic conversion using zod-to-json-schema
import { zodToJsonSchema } from 'zod-to-json-schema';
```

---

## Tool System Architecture

### Available Tools

1. **createCompany** - Create new companies with validation
2. **generateApi** - Generate API specifications for services
3. **linkEntities** - Create connections between infrastructure entities
4. **expandInfrastructure** - Add new infrastructure components
5. **searchCompanies** - Search vector database for companies
6. **controlSimulation** - Control simulation state

### Tool Handler Implementation (`src/tools/handlers.ts`)

```typescript
export class ToolHandlers {
  private async handleCreateCompany(action: CreateCompanyAction): Promise<ToolExecutionResult>
  private async handleGenerateApi(action: GenerateApiAction): Promise<ToolExecutionResult>
  private async handleSearchCompanies(action: SearchCompaniesAction): Promise<ToolExecutionResult>
  private async handleControlSimulation(action: ControlSimulationAction): Promise<ToolExecutionResult>
  // ... other handlers
}
```

### Natural Language Processing Flow

1. **Input**: Natural language command
2. **Parsing**: LLM converts to structured tool action
3. **Validation**: Zod schema validation
4. **Execution**: Tool handler processes action
5. **Response**: Structured result with success/error

---

## Vector Memory System

### Implementation (`src/core/vector-memory-manager.ts`)

**Vector Store**: FAISS (Facebook AI Similarity Search)
**Embeddings**: Local embeddings via Ollama
**Storage**: Local filesystem (vector-store)

#### Key Methods

```typescript
export class VectorMemoryManager {
  // Company operations
  async addCompanyRecord(record: CompanyMemoryRecord): Promise<void>
  async searchCompanies(query: string, limit: number = 5): Promise<VectorSearchResult[]>
  async findSimilarCompanies(companyId: string, limit: number = 5): Promise<VectorSearchResult[]>
  async getAllCompanies(): Promise<CompanyMemoryRecord[]>
  
  // Vector operations
  private async generateEmbeddings(texts: string[]): Promise<number[][]>
  private createSearchableText(record: CompanyMemoryRecord): string
}
```

#### Company Record Schema

```typescript
export interface CompanyMemoryRecord {
  id: string;
  name: string;
  description: string;
  sectorTags: string[];
  services: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## OpenAPI Generation

### Dynamic API Stub Generator (`src/utils/openApiStubGenerator.ts`)

**Purpose**: Generate realistic API specifications for infrastructure entities

#### Generation Logic

```typescript
export function generateOpenAPIStub(entity: InfrastructureEntity): Record<string, EndpointSpec>
```

**Supported Entity Types**:
- `API_SERVICE`
- `WEB_APP`

#### Default Endpoints Generated

1. **Health Check**: `GET /health`
2. **Status**: `GET /status`
3. **Function-specific endpoints** based on `coreFunctions` metadata

#### Function-to-Endpoint Mapping

- **Payment Functions**: `/send`, `/receive` endpoints
- **Authentication**: `/login`, `/logout` endpoints
- **User Management**: users CRUD endpoints
- **Generic CRUD**: `/create`, `/get`, `/update`, `/delete`

---

## Configuration Management

### Environment Configuration

```typescript
// Default Ollama configuration
const OLLAMA_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'smangrul/llama-3-8b-instruct-function-calling'
```

### Model Configuration

All LLM instances use consistent configuration:
```typescript
new ChatOllama({
  baseUrl: ollamaBaseUrl,
  model: 'smangrul/llama-3-8b-instruct-function-calling',
  temperature: 0.1, // Low temperature for consistency
});
```

---

## Error Handling and Validation

### Validation Patterns

1. **Input Validation**: Zod schemas validate all inputs
2. **LLM Output Validation**: Structured parsers ensure valid responses
3. **Fallback Mechanisms**: Graceful degradation when LLM parsing fails
4. **Type Safety**: Full TypeScript coverage with strict typing

### Error Response Format

```typescript
interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  executionTime?: number;
}
```

---

## Testing and Development

### Test Scripts

1. **`test-structured-tools.js`** - Tool system testing
2. **`test-vector-db.js`** - Vector database testing
3. **`demo-structured-tools.ts`** - Comprehensive demo
4. **`vector-memory-demo.ts`** - Vector memory demonstration

### Development Commands

```bash
# Start development server with Ollama
yarn dev

# Setup Ollama models
yarn ollama:setup

# Seed vector database
yarn seed:companies

# Run individual tests
node test-structured-tools.js
node test-vector-db.js
```

---

## Security Considerations

### Current State (Development)

- **No Authentication**: APIs are open for development
- **No Rate Limiting**: Unlimited requests allowed
- **Local LLM**: All processing happens locally
- **No Input Sanitization**: Basic validation only

### Production Recommendations

1. **API Authentication**: Implement JWT or API key authentication
2. **Rate Limiting**: Add request throttling
3. **Input Sanitization**: Enhanced validation and sanitization
4. **CORS Configuration**: Proper cross-origin request handling
5. **Logging and Monitoring**: Comprehensive audit trails

---

## Performance Considerations

### LLM Performance

- **Model Size**: `smangrul/llama-3-8b-instruct-function-calling` requires significant resources
- **Response Time**: Typical 1-5 seconds per LLM call
- **Concurrency**: Single-threaded LLM processing
- **Caching**: No response caching implemented

### Vector Database Performance

- **Search Speed**: FAISS provides fast similarity search
- **Memory Usage**: Indexes loaded into memory
- **Scalability**: Limited by available RAM

### Optimization Opportunities

1. **Response Caching**: Cache LLM responses for common queries
2. **Batch Processing**: Process multiple requests together
3. **Model Optimization**: Use smaller models for specific tasks
4. **Database Optimization**: Implement proper indexing strategies

---

## Deployment Architecture

### Current Setup (Development)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│  Ollama Server  │────│ Vector Storage  │
│  (Port 3000)    │    │  (Port 11434)   │    │ (File System)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Production Considerations

1. **Load Balancing**: Multiple application instances
2. **Database Clustering**: Distributed vector storage
3. **Model Serving**: Dedicated LLM inference servers
4. **Monitoring**: Comprehensive observability stack

---

## Future Enhancements

### Planned Features

1. **Multi-Model Support**: Support for different LLM providers
2. **Advanced Analytics**: Infrastructure simulation analytics
3. **Real-time Collaboration**: Multi-user simulation environments
4. **Advanced Networking**: Complex network topology simulation
5. **Compliance Frameworks**: Built-in compliance checking

### Architecture Evolution

1. **Microservices**: Break down into smaller services
2. **Event-Driven**: Implement event-based architecture
3. **GraphQL**: Advanced query capabilities
4. **Real-time Updates**: WebSocket-based live updates

---

## Troubleshooting

### Common Issues

1. **Ollama Connection**: Ensure Ollama server is running on port 11434
2. **Model Download**: Verify `smangrul/llama-3-8b-instruct-function-calling` model is available
3. **Vector Store**: Check vector-store directory permissions
4. **Memory Issues**: Monitor RAM usage with large vector databases

### Debug Information

Enable debug logging by setting environment variables:
```bash
DEBUG=langchain:* yarn dev
```

---

## API Reference Summary

| Endpoint | Method | Purpose | Schema |
|----------|--------|---------|---------|
| `/api/vector-memory` | GET | Search companies | Query params |
| `/api/vector-memory` | POST | Add company | CompanyMemoryRecord |
| `/api/vector-memory` | DELETE | Clear database | None |

## Schema Reference Summary

| Schema | Purpose | Location |
|--------|---------|----------|
| `InfrastructureEntitySchema` | Entity validation | langchain-orchestrator.ts |
| `ToolActionSchema` | Tool commands | schema.ts |
| `CompanyMemoryRecord` | Vector storage | infrastructure.ts |
| `OpenApiSpecSchema` | API generation | InfrastructureBuilder.ts |