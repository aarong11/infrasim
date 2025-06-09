import { InfrastructureEntity } from '../../types/infrastructure';

export interface CompanyProfile {
  id: string;
  name: string;
  description: string;
  sector: string;
  coreFunctions: string[];
  regulatoryRequirements?: string[];
  infrastructure: SimulatedComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface SimulatedComponent {
  id: string;
  type: string; // e.g. DNS, WebApp, DB, Auth, Firewall
  fidelity: 'virtual' | 'semi-real' | 'concrete';
  description: string;
  openApiStub?: string;
}

export interface CompanyCreationRequest {
  description: string;
  name?: string;
}

export interface InfrastructureTopology {
  entities: Partial<InfrastructureEntity>[];
  connections: Array<{ from: string; to: string }>;
}