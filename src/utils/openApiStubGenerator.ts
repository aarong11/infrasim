import { InfrastructureEntity, EntityType, EndpointSpec } from '../types/infrastructure';

interface OpenAPIStubInput {
  id: string;
  name: string;
  type: EntityType;
  fidelity: string;
  metadata: {
    endpoints?: string[];
    coreFunctions?: string[];
    compliance?: string[];
  };
}

export function generateOpenAPIStub(entity: InfrastructureEntity): Record<string, EndpointSpec> {
  // Only generate stubs for API services and web apps
  if (entity.type !== EntityType.API_SERVICE && entity.type !== EntityType.WEB_APP) {
    return {};
  }

  const endpoints = entity.metadata.endpoints || [];
  const coreFunctions = entity.metadata.coreFunctions || [];
  const compliance = entity.metadata.compliance || [];
  
  const stub: Record<string, EndpointSpec> = {};

  // If no endpoints specified, generate default ones based on core functions
  if (endpoints.length === 0) {
    return generateDefaultEndpoints(entity.name, coreFunctions, compliance);
  }

  // Generate spec for each endpoint
  endpoints.forEach(endpoint => {
    const spec = generateEndpointSpec(endpoint, entity.name, coreFunctions, compliance);
    stub[endpoint] = spec;
  });

  return stub;
}

function generateDefaultEndpoints(
  serviceName: string, 
  coreFunctions: string[], 
  compliance: string[]
): Record<string, EndpointSpec> {
  const defaultEndpoints: Record<string, EndpointSpec> = {
    '/health': {
      method: 'GET',
      request: {},
      response: { status: 'string', timestamp: 'string' }
    },
    '/status': {
      method: 'GET', 
      request: {},
      response: { service: 'string', version: 'string', uptime: 'number' }
    }
  };

  // Add function-specific endpoints
  coreFunctions.forEach(func => {
    const endpoints = generateFunctionEndpoints(func, compliance);
    Object.assign(defaultEndpoints, endpoints);
  });

  return defaultEndpoints;
}

function generateEndpointSpec(
  endpoint: string,
  serviceName: string,
  coreFunctions: string[],
  compliance: string[]
): EndpointSpec {
  const path = endpoint.toLowerCase();
  
  // Determine HTTP method based on endpoint name
  let method = 'GET';
  if (path.includes('create') || path.includes('send') || path.includes('post')) {
    method = 'POST';
  } else if (path.includes('update') || path.includes('put')) {
    method = 'PUT';
  } else if (path.includes('delete')) {
    method = 'DELETE';
  }

  // Generate request/response schemas based on endpoint name and functions
  const { request, response } = generateSchemas(endpoint, coreFunctions);

  return {
    method,
    request,
    response,
    compliance: compliance.length > 0 ? compliance : undefined
  };
}

function generateSchemas(endpoint: string, coreFunctions: string[]): {
  request: Record<string, string>;
  response: Record<string, string>;
} {
  const path = endpoint.toLowerCase();
  
  // Payment-related endpoints
  if (path.includes('payment') || path.includes('send') || path.includes('receive')) {
    return {
      request: {
        to: 'string',
        amount: 'number',
        currency: 'string',
        reference: 'string'
      },
      response: {
        success: 'boolean',
        transactionId: 'string',
        timestamp: 'string'
      }
    };
  }
  
  // Authentication endpoints
  if (path.includes('login') || path.includes('auth')) {
    return {
      request: {
        username: 'string',
        password: 'string'
      },
      response: {
        success: 'boolean',
        token: 'string',
        expiresIn: 'number'
      }
    };
  }
  
  // User management
  if (path.includes('user') || path.includes('profile')) {
    return {
      request: {
        userId: 'string',
        email: 'string',
        name: 'string'
      },
      response: {
        id: 'string',
        email: 'string',
        name: 'string',
        createdAt: 'string'
      }
    };
  }
  
  // Generic CRUD
  if (path.includes('create')) {
    return {
      request: { data: 'object' },
      response: { id: 'string', success: 'boolean' }
    };
  }
  
  if (path.includes('get') || path.includes('fetch')) {
    return {
      request: { id: 'string' },
      response: { data: 'object' }
    };
  }
  
  // Default schema
  return {
    request: {},
    response: { success: 'boolean', data: 'object' }
  };
}

function generateFunctionEndpoints(
  coreFunction: string,
  compliance: string[]
): Record<string, EndpointSpec> {
  const func = coreFunction.toLowerCase();
  const endpoints: Record<string, EndpointSpec> = {};
  
  if (func.includes('payment')) {
    endpoints['/send'] = {
      method: 'POST',
      request: { to: 'string', amount: 'number', currency: 'string' },
      response: { success: 'boolean', txId: 'string' },
      compliance
    };
    
    endpoints['/receive'] = {
      method: 'POST', 
      request: { from: 'string', note: 'string' },
      response: { success: 'boolean' },
      compliance
    };
  }
  
  if (func.includes('auth')) {
    endpoints['/login'] = {
      method: 'POST',
      request: { username: 'string', password: 'string' },
      response: { success: 'boolean', token: 'string' },
      compliance
    };
    
    endpoints['/logout'] = {
      method: 'POST',
      request: { token: 'string' },
      response: { success: 'boolean' },
      compliance
    };
  }
  
  if (func.includes('user') || func.includes('customer')) {
    endpoints['/users'] = {
      method: 'GET',
      request: {},
      response: { users: 'array' },
      compliance
    };
    
    endpoints['/users'] = {
      method: 'POST',
      request: { email: 'string', name: 'string' },
      response: { id: 'string', success: 'boolean' },
      compliance
    };
  }
  
  return endpoints;
}