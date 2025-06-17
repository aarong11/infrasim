'use client';
import { CompanyMemoryRecord, VectorSearchResult, InfrastructureEntity } from '../types/infrastructure';

export class ClientVectorMemoryService {
  private apiUrl = '/api/vector-memory';

  private async makeRequest(action: string, params: any = {}) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...params,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`ClientVectorMemoryService error (${action}):`, error);
      throw error;
    }
  }

  async getAllCompaniesFromMemory(): Promise<CompanyMemoryRecord[]> {
    const response = await this.makeRequest('getAllCompanies');
    return response.companies || [];
  }

  async addCompanyToMemory(companyData: {
    name: string;
    description: string;
    sectorTags: string[];
    services: string[];
    metadata: any;
    daoContractAddress?: string;
  }): Promise<string> {
    const company: Partial<CompanyMemoryRecord> = {
      id: crypto.randomUUID(),
      name: companyData.name,
      description: companyData.description,
      sectorTags: companyData.sectorTags,
      services: companyData.services,
      metadata: companyData.metadata,
      daoContractAddress: companyData.daoContractAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await this.makeRequest('addCompany', { company });
    return response.id;
  }

  async searchCompaniesInMemory(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    const response = await this.makeRequest('searchCompanies', { query, limit });
    return response.results || [];
  }

  async findSimilarCompanies(companyId: string, limit: number = 5): Promise<VectorSearchResult[]> {
    const response = await this.makeRequest('findSimilarCompanies', { companyId, limit });
    return response.results || [];
  }

  async updateCompanyInMemory(company: CompanyMemoryRecord): Promise<void> {
    await this.makeRequest('updateCompany', { company });
  }

  async createRootOrganizationWithMemory(description: string): Promise<InfrastructureEntity> {
    const response = await this.makeRequest('createOrganization', { description });
    return response.organization;
  }

  async parseInfrastructureDescription(description: string): Promise<any> {
    const response = await this.makeRequest('parseInfrastructure', { description });
    return response.parsed;
  }

  async generateChatResponse(message: string, context?: any): Promise<string> {
    const response = await this.makeRequest('generateChatResponse', { message, context });
    return response.response;
  }

  async addInfrastructureToCompany(companyId: string, entity: InfrastructureEntity): Promise<string> {
    const response = await this.makeRequest('addCompanyInfrastructure', { companyId, entity });
    return response.entityId;
  }

  async removeInfrastructureFromCompany(companyId: string, entityId: string): Promise<void> {
    await this.makeRequest('removeCompanyInfrastructure', { companyId, entityId });
  }

  async updateCompanyInfrastructure(companyId: string, entity: InfrastructureEntity): Promise<void> {
    await this.makeRequest('updateCompanyInfrastructure', { companyId, entity });
  }

  async getCompanyInfrastructure(companyId: string): Promise<InfrastructureEntity[]> {
    const response = await this.makeRequest('getCompanyInfrastructure', { companyId });
    return response.infrastructure || [];
  }

  async describeInfrastructureLayout(companyId: string): Promise<string> {
    const response = await this.makeRequest('describeInfrastructureLayout', { companyId });
    return response.layout;
  }
}