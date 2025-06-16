# InfraSim - AI-Powered Infrastructure Simulation Platform

<div align="center">
  <h3>🏗️ Design • 🤖 Simulate • 📊 Analyze</h3>
  <p>Advanced infrastructure modeling and simulation with AI-powered assistance</p>
</div>

## Overview

InfraSim is a comprehensive infrastructure simulation platform that combines modern web technologies with artificial intelligence to help you design, model, and analyze IT infrastructure. Built with Next.js 14, TypeScript, and LangChain, it provides an intuitive interface for creating complex infrastructure topologies and simulating their behavior in real-time.

### Key Features

- 🤖 **AI-Powered Design** - Natural language infrastructure generation using multiple LLM providers
- 🎯 **Interactive Modeling** - Visual drag-and-drop infrastructure builder with ReactFlow
- 💬 **Intelligent Chat** - Context-aware AI assistant with full infrastructure knowledge
- 🔄 **Real-Time Simulation** - Live infrastructure behavior simulation and monitoring
- 🗄️ **Vector Memory** - Persistent company and infrastructure storage with semantic search
- 🔧 **Multi-Model Support** - Lambda Labs, OpenAI, Ollama, and local model compatibility
- 📊 **Advanced Analytics** - Network topology analysis and performance insights

## Quick Start

### Prerequisites

- **Node.js 18+** - Runtime environment
- **NPM/Yarn** - Package manager
- **Ollama** (optional) - For local AI models

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/infrasim.git
   cd infrasim
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up local AI models (optional)**
   ```bash
   npm run ollama:setup
   ```

4. **Start the development environment**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

### Environment Setup

Create a `.env.local` file for API keys (optional):

```env
# Lambda Labs API (recommended)
LAMBDA_LABS_API_KEY=your_lambda_labs_api_key

# OpenAI API (alternative)
OPENAI_API_KEY=your_openai_api_key

# Anthropic API (planned)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Usage Guide

### 1. Getting Started

**First Launch:**
1. Open InfraSim in your browser
2. Click the settings gear icon to configure your AI models
3. Add API keys or set up local Ollama models
4. Start creating your first infrastructure!

### 2. Creating Infrastructure

**Method 1: Natural Language Generation**
```
"Create a fintech company called NeoBank with a web portal, 
core banking database, and security firewall"
```

**Method 2: Visual Designer**
- Use the "+" button to add components
- Drag nodes to position them
- Click and drag between ports to create connections
- Right-click nodes for configuration options

**Method 3: AI Chat Assistant**
- Type natural language requests in the chat
- Ask questions about your infrastructure
- Request modifications and improvements

### 3. Infrastructure Components

#### Supported Entity Types
- 🌐 **Web Applications** - Frontend services, portals, dashboards
- 🗄️ **Databases** - SQL, NoSQL, data warehouses
- 🔌 **API Services** - REST, GraphQL, microservices
- ⚖️ **Load Balancers** - Traffic distribution, high availability
- 🛡️ **Firewalls** - Network security, access control
- 🌍 **DNS Servers** - Domain name resolution
- ⏰ **NTP Servers** - Time synchronization

#### Component Properties
Each component includes:
- **Basic Info**: Name, hostname, IP address
- **Network Config**: Ports, protocols, services
- **Connections**: Linked components and relationships
- **Metadata**: Descriptions, compliance tags, custom properties

### 4. AI Features

#### Chat Assistant
The AI assistant provides context-aware help:
- **Infrastructure Analysis**: "Analyze the security of my current setup"
- **Recommendations**: "How can I improve scalability?"
- **Troubleshooting**: "Why might my database be a bottleneck?"
- **Best Practices**: "What compliance standards should I consider?"

#### Natural Language Processing
Convert descriptions into infrastructure:
- **Company Profiles**: Extract industry, compliance requirements, core services
- **Infrastructure Parsing**: Generate components from descriptions
- **Relationship Inference**: Automatically detect component connections

#### Vector Memory
Intelligent storage and retrieval:
- **Semantic Search**: Find similar companies and patterns
- **Context Building**: Maintain conversation and infrastructure history
- **Pattern Recognition**: Learn from previous infrastructure designs

### 5. Simulation Engine

#### Real-Time Monitoring
- **Component Status**: Live health and performance indicators
- **Network Traffic**: Connection utilization and throughput
- **Alerts**: Security issues, performance bottlenecks
- **Logs**: Detailed component activity and events

#### Simulation Controls
- **Start/Stop**: Control simulation execution
- **Speed**: Adjust simulation tick rate
- **Scenarios**: Test different load patterns and failure modes

## Architecture Overview

### Technology Stack

**Frontend:**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **ReactFlow** - Interactive node-based UI
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management

**Backend:**
- **Next.js API Routes** - Serverless API endpoints
- **LangChain** - AI/LLM integration framework
- **FAISS** - Vector similarity search
- **Zod** - Runtime type validation

**AI Integration:**
- **Lambda Labs** - High-performance Llama models
- **OpenAI** - GPT models with function calling
- **Ollama** - Local model execution
- **Custom Parsers** - Robust JSON extraction and validation

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │───▶│   API Routes     │───▶│   LLM Providers │
│   Components    │    │   (Next.js)      │    │   (Multi-model) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Zustand       │    │   Vector Memory  │    │   Tool System   │
│   State         │    │   (FAISS)        │    │   (Zod Schema)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## API Reference

### Core Endpoints

#### `/api/vector-memory` - Main API
Central endpoint for all operations:

```typescript
// Company Management
POST /api/vector-memory
{
  "action": "addCompany",
  "company": { /* CompanyData */ }
}

// Infrastructure Operations
POST /api/vector-memory
{
  "action": "getCompanyInfrastructure",
  "companyId": "uuid"
}

// AI Chat
POST /api/vector-memory
{
  "action": "generateChatResponse",
  "message": "How can I improve security?",
  "context": { /* InfrastructureContext */ }
}
```

#### `/api/langchain-agent` - Tool Execution
Structured tool-based operations:

```typescript
POST /api/langchain-agent
{
  "action": "modifyInfrastructure",
  "parameters": {
    "operation": "add",
    "entity": { /* EntityData */ }
  }
}
```

#### `/api/lambda-proxy` - External LLM Proxy
Handles external API calls with CORS protection:

```typescript
POST /api/lambda-proxy
{
  "model": "llama-4-maverick-17b-128e-instruct-fp8",
  "messages": [{ "role": "user", "content": "..." }],
  "temperature": 0.3
}
```

### Data Schemas

#### Company Schema
```typescript
interface CompanyMemoryRecord {
  id: string;
  name: string;
  description: string;
  sectorTags: string[];
  services: string[];
  infrastructure?: InfrastructureEntity[];
  metadata: {
    industry: string;
    compliance: string[];
    employees: number;
    founded: number;
    headquarters: string;
  };
}
```

#### Infrastructure Entity Schema
```typescript
interface InfrastructureEntity {
  id: string;
  type: EntityType;
  name: string;
  hostname: string;
  ip: string;
  fidelity: FidelityLevel;
  ports: Port[];
  metadata: Record<string, any>;
  position: { x: number; y: number };
  connections: string[];
}
```

## Development

### Project Structure

```
infrasim/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API route handlers
│   │   ├── infrastructure/ # Main application page
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── InfrastructureMap.tsx
│   │   ├── EntityNode.tsx
│   │   └── ...
│   ├── core/              # Business logic
│   │   ├── langchain-orchestrator.ts
│   │   ├── model-manager.ts
│   │   └── vector-memory-manager.ts
│   ├── store/             # State management
│   ├── tools/             # AI tool definitions
│   └── types/             # TypeScript types
├── data/                  # Vector store data
├── seed/                  # Sample data scripts
└── postman/               # API testing
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Setup and Maintenance
npm run setup           # Complete setup with Ollama
npm run ollama:setup    # Download AI models
npm run seed           # Populate sample data
npm run reset-vector-db # Reset vector database

# Utilities
npm run lint           # Run ESLint
npm run clean          # Clean build artifacts
```

### Development Workflow

1. **Start Development Environment**
   ```bash
   npm run dev
   ```
   This automatically:
   - Starts Ollama (if installed)
   - Launches Next.js development server
   - Enables hot reload for all components

2. **Add New Components**
   - Create React components in `src/components/`
   - Add business logic to `src/core/`
   - Define types in `src/types/`

3. **Extend AI Capabilities**
   - Add tool schemas in `src/tools/schema.ts`
   - Implement handlers in `src/tools/handlers.ts`
   - Test with LLM integration

4. **Configure Models**
   - Update model registry in `src/app/api/vector-memory/route.ts`
   - Add new processing modes if needed
   - Test with different providers

## Configuration

### Model Configuration

**Single Model Mode** (Recommended for beginners):
```typescript
{
  modelMode: 'single',
  toolsModel: 'llama-4-maverick-17b-128e-instruct-fp8',
  // Uses same model for both chat and tools
}
```

**Dual Model Mode** (Advanced users):
```typescript
{
  modelMode: 'dual',
  chatModel: 'gpt-4',                                    // For conversations
  toolsModel: 'llama-4-maverick-17b-128e-instruct-fp8', // For structured tasks
}
```

### Environment Variables

```env
# Server-side API keys (recommended)
LAMBDA_LABS_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# Application settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Local Storage Settings

Client-side configuration stored in browser:
- API keys (if not set server-side)
- Model preferences
- UI settings
- Chat history

## Troubleshooting

### Common Issues

**1. "Model not found" errors**
- Verify API keys are correctly set
- Check model names in settings
- Ensure Ollama is running for local models

**2. CORS errors with external APIs**
- Use the proxy endpoints (`/api/lambda-proxy`)
- Check API key configuration
- Verify network connectivity

**3. Vector database issues**
- Run `npm run reset-vector-db` to reset
- Check file permissions in `data/vector-store/`
- Ensure sufficient disk space

**4. Slow AI responses**
- Check model configuration and temperature settings
- Monitor API rate limits
- Consider switching to faster models

### Debug Mode

Enable detailed logging:
```typescript
// In settings or environment
DEBUG_MODE=true
LOG_LEVEL=verbose
```

Access logs through:
- Browser console for client-side issues
- Server terminal for API issues
- Built-in logs console in the UI

## Contributing

### Getting Involved

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests** (if applicable)
5. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow TypeScript best practices
- **Components**: Use functional components with hooks
- **State**: Prefer Zustand for global state
- **Types**: Maintain strict TypeScript typing
- **Testing**: Add tests for new functionality
- **Documentation**: Update docs for API changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **LangChain** - AI/LLM integration framework
- **Next.js** - React framework and development platform
- **ReactFlow** - Interactive node-based UI library
- **Lambda Labs** - High-performance AI model hosting
- **OpenAI** - GPT models and API infrastructure
- **Ollama** - Local LLM execution platform

---

<div align="center">
  <p><strong>Built with ❤️ for the infrastructure community</strong></p>
  <p>
    <a href="#quick-start">Get Started</a> •
    <a href="ARCHITECTURE.md">Architecture</a> •
    <a href="#api-reference">API Docs</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>