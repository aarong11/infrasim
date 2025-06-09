export enum EntityType {
  DNS_SERVER = 'dns_server',
  NTP_SERVER = 'ntp_server',
  WEB_APP = 'web_app',
  DATABASE = 'database',
  FIREWALL = 'firewall',
  LOAD_BALANCER = 'load_balancer',
  SOCIAL_AGENT = 'social_agent',
  API_SERVICE = 'api_service',
  ORGANIZATION = 'organization',
}

export enum FidelityLevel {
  VIRTUAL = 'virtual',
  SEMI_REAL = 'semi_real',
  CONCRETE = 'concrete',
}

export interface Port {
  number: number;
  protocol: 'tcp' | 'udp';
  service: string;
  status: 'open' | 'closed' | 'filtered';
}

export interface InfrastructureEntity {
  id: string;
  type: EntityType;
  name: string;
  hostname: string;
  ip: string;
  fidelity: FidelityLevel;
  ports: Port[];
  metadata: Record<string, any> & {
    endpoints?: string[];
    coreFunctions?: string[];
    compliance?: string[];
    openAPIStub?: Record<string, EndpointSpec>;
    internalEntities?: InfrastructureEntity[]; // For organization drill-down
    description?: string;
  };
  position: { x: number; y: number };
  connections: string[]; // IDs of connected entities
  logs: LogEntry[];
  apiSpec?: OpenAPISpec;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, any>;
  components?: Record<string, any>;
}

export interface SimulationState {
  entities: Record<string, InfrastructureEntity>;
  clock: number;
  isRunning: boolean;
  tickRate: number; // ms between ticks
}

export interface InfrastructurePrompt {
  text: string;
  timestamp: Date;
  parsedEntities?: string[];
}

export interface EndpointSpec {
  method: string;
  request: Record<string, string>;
  response: Record<string, string>;
  compliance?: string[];
}

export interface Company {
  id: string;
  name: string;
  description: string;
  tags: string[];
  industry: 'banking' | 'logistics' | 'defense' | 'tech' | 'public';
  complexity: 'simple' | 'moderate' | 'complex';
  compliance: string[];
}

export interface CompanyMemoryRecord {
  id: string;
  name: string;
  description: string;
  sectorTags: string[];
  services: string[];
  metadata: Record<string, any>;
  infrastructure?: InfrastructureEntity[]; // Added infrastructure field
  createdAt: Date;
  updatedAt: Date;
}

export interface VectorSearchResult {
  record: CompanyMemoryRecord;
  score: number;
  similarity: number;
}
