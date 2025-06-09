import { z } from 'zod';

// Base action schema
export const BaseActionSchema = z.object({
  action: z.string(),
  parameters: z.record(z.any())
});

// Company creation tool schema
export const CreateCompanySchema = z.object({
  action: z.literal('createCompany'),
  parameters: z.object({
    name: z.string().min(1, 'Company name is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    jurisdiction: z.string().optional().describe('Country or region where company operates'),
    industry: z.enum(['banking', 'fintech', 'tech', 'healthcare', 'logistics', 'defense', 'retail', 'energy', 'manufacturing', 'telecom', 'public']).describe('Primary industry sector'),
    tags: z.array(z.string()).min(1, 'At least one tag is required').describe('Sector tags and keywords'),
    services: z.array(z.string()).min(1, 'At least one service is required').describe('Core business services'),
    compliance: z.array(z.string()).optional().describe('Regulatory compliance standards'),
    employees: z.number().int().positive().optional().describe('Number of employees'),
    founded: z.number().int().min(1800).max(2030).optional().describe('Year founded'),
    headquarters: z.string().optional().describe('Headquarters location')
  })
});

// API generation tool schema
export const GenerateApiSchema = z.object({
  action: z.literal('generateApi'),
  parameters: z.object({
    companyId: z.string().uuid().describe('Company ID to generate API for'),
    apiType: z.enum(['rest', 'graphql', 'grpc', 'websocket']).default('rest').describe('Type of API to generate'),
    serviceName: z.string().min(1, 'Service name is required').describe('Name of the API service'),
    endpoints: z.array(z.object({
      path: z.string().describe('API endpoint path'),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).describe('HTTP method'),
      description: z.string().describe('Endpoint description'),
      requestBody: z.record(z.any()).optional().describe('Request body schema'),
      responseBody: z.record(z.any()).optional().describe('Response body schema')
    })).min(1, 'At least one endpoint is required'),
    authentication: z.enum(['none', 'apikey', 'oauth2', 'jwt', 'basic']).default('apikey').describe('Authentication method'),
    rateLimit: z.number().int().positive().optional().describe('Requests per minute limit')
  })
});

// Infrastructure linking tool schema
export const LinkEntitiesSchema = z.object({
  action: z.literal('linkEntities'),
  parameters: z.object({
    sourceEntityId: z.string().uuid().describe('Source entity ID'),
    targetEntityId: z.string().uuid().describe('Target entity ID'),
    connectionType: z.enum(['api', 'database', 'messaging', 'file_transfer', 'vpn', 'direct']).describe('Type of connection'),
    protocol: z.string().optional().describe('Network protocol (e.g., HTTP, TCP, UDP)'),
    port: z.number().int().min(1).max(65535).optional().describe('Network port'),
    bidirectional: z.boolean().default(true).describe('Whether connection is bidirectional'),
    description: z.string().optional().describe('Connection description')
  })
});

// Infrastructure expansion tool schema
export const ExpandInfrastructureSchema = z.object({
  action: z.literal('expandInfrastructure'),
  parameters: z.object({
    companyId: z.string().uuid().describe('Company ID to expand infrastructure for'),
    entityType: z.enum(['web_app', 'database', 'api_service', 'load_balancer', 'firewall', 'dns_server', 'ntp_server']).describe('Type of infrastructure entity to create'),
    name: z.string().min(1, 'Entity name is required'),
    hostname: z.string().min(1, 'Hostname is required'),
    ports: z.array(z.object({
      number: z.number().int().min(1).max(65535),
      protocol: z.enum(['tcp', 'udp']),
      service: z.string(),
      status: z.enum(['open', 'closed', 'filtered']).default('open')
    })).optional().default([]),
    metadata: z.record(z.any()).optional().describe('Additional entity metadata')
  })
});

// Company search tool schema
export const SearchCompaniesSchema = z.object({
  action: z.literal('searchCompanies'),
  parameters: z.object({
    query: z.string().min(1, 'Search query is required').describe('Search terms for companies'),
    industry: z.enum(['banking', 'fintech', 'tech', 'healthcare', 'logistics', 'defense', 'retail', 'energy', 'manufacturing', 'telecom', 'public']).optional().describe('Filter by industry'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
    limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of results')
  })
});

// Simulation control tool schema
export const ControlSimulationSchema = z.object({
  action: z.literal('controlSimulation'),
  parameters: z.object({
    command: z.enum(['start', 'stop', 'pause', 'resume', 'reset']).describe('Simulation control command'),
    tickRate: z.number().int().min(100).max(10000).optional().describe('Simulation tick rate in milliseconds'),
    targetEntityId: z.string().uuid().optional().describe('Target specific entity for simulation')
  })
});

// Infrastructure modification tool schema
export const ModifyInfrastructureActionSchema = z.object({
  action: z.literal('modifyInfrastructure'),
  parameters: z.object({
    companyId: z.string().describe('Company ID to modify infrastructure for'),
    operation: z.enum(['add', 'remove', 'update', 'describe']).describe('Infrastructure operation to perform'),
    entity: z.object({
      id: z.string().optional(),
      type: z.enum(['dns_server', 'ntp_server', 'web_app', 'database', 'firewall', 'load_balancer', 'social_agent', 'api_service']).optional(),
      name: z.string().optional(),
      hostname: z.string().optional(),
      ip: z.string().optional(),
      ports: z.array(z.object({
        number: z.number(),
        protocol: z.enum(['tcp', 'udp']),
        service: z.string(),
        status: z.enum(['open', 'closed', 'filtered']).default('open')
      })).optional(),
      metadata: z.record(z.any()).optional(),
      position: z.object({
        x: z.number(),
        y: z.number()
      }).optional()
    }).optional().describe('Entity data for add/update operations'),
    entityId: z.string().optional().describe('Entity ID for remove operations'),
    layoutInstructions: z.string().optional().describe('Natural language layout positioning instructions')
  })
});

// Chat conversation tool schema
export const ChatActionSchema = z.object({
  action: z.literal('chat'),
  parameters: z.object({
    message: z.string().describe('User message for general conversation'),
    context: z.object({
      companyId: z.string().optional(),
      companyName: z.string().optional(),
      currentInfrastructure: z.array(z.string()).optional().describe('List of current infrastructure component names'),
      topic: z.string().optional().describe('Current conversation topic')
    }).optional().describe('Context about the current infrastructure and conversation')
  })
});

// Union of all tool schemas using discriminated union
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

// Type definitions
export type ToolAction = z.infer<typeof ToolActionSchema>;
export type CreateCompanyAction = z.infer<typeof CreateCompanySchema>;
export type GenerateApiAction = z.infer<typeof GenerateApiSchema>;
export type LinkEntitiesAction = z.infer<typeof LinkEntitiesSchema>;
export type ExpandInfrastructureAction = z.infer<typeof ExpandInfrastructureSchema>;
export type SearchCompaniesAction = z.infer<typeof SearchCompaniesSchema>;
export type ControlSimulationAction = z.infer<typeof ControlSimulationSchema>;
export type ModifyInfrastructureAction = z.infer<typeof ModifyInfrastructureActionSchema>;

// Tool metadata for help and documentation
export const ToolMetadata = {
  createCompany: {
    name: 'Create Company',
    description: 'Create a new company with specified details and add it to the vector database',
    examples: [
      'Create a fintech company called MikuBank that handles micropayments in the UK',
      'Add a healthcare technology company called MedCore specializing in AI diagnostics'
    ]
  },
  generateApi: {
    name: 'Generate API',
    description: 'Generate API specifications and endpoints for a company service',
    examples: [
      'Generate a REST API for payment processing for MikuBank',
      'Create a GraphQL API for patient data management'
    ]
  },
  linkEntities: {
    name: 'Link Entities',
    description: 'Create connections between infrastructure entities',
    examples: [
      'Connect the web server to the database with a TCP connection',
      'Link the API gateway to the authentication service'
    ]
  },
  expandInfrastructure: {
    name: 'Expand Infrastructure',
    description: 'Add new infrastructure components to a company',
    examples: [
      'Add a load balancer to MikuBank infrastructure',
      'Create a new database server for customer data'
    ]
  },
  searchCompanies: {
    name: 'Search Companies',
    description: 'Search for companies in the vector database by various criteria',
    examples: [
      'Find all fintech companies',
      'Search for companies with AI and healthcare tags'
    ]
  },
  controlSimulation: {
    name: 'Control Simulation',
    description: 'Start, stop, or modify the infrastructure simulation',
    examples: [
      'Start the simulation',
      'Pause the simulation and set tick rate to 500ms'
    ]
  },
  modifyInfrastructure: {
    name: 'Modify Infrastructure',
    description: 'Modify existing infrastructure components of a company',
    examples: [
      'Add a new web server to the company infrastructure',
      'Remove an outdated database server from the infrastructure'
    ]
  }
} as const;