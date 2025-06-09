import { CompanyMemoryRecord, VectorSearchResult, InfrastructureEntity } from '../types/infrastructure';

export class ClientVectorMemoryService {
  private baseUrl = '/api/vector-memory';

  async addCompanyToMemory(company: Omit<CompanyMemoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addCompany', company })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.id;
  }

  async searchCompaniesInMemory(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'searchCompanies', query, limit })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.results;
  }

  async findSimilarCompanies(companyId: string, limit: number = 5): Promise<VectorSearchResult[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'findSimilarCompanies', companyId, limit })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.results;
  }

  async getAllCompaniesFromMemory(): Promise<CompanyMemoryRecord[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getAllCompanies' })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.companies.map((company: any) => ({
      ...company,
      createdAt: new Date(company.createdAt),
      updatedAt: new Date(company.updatedAt)
    }));
  }

  async updateCompanyInMemory(company: CompanyMemoryRecord): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateCompany', company })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  async createRootOrganizationWithMemory(description: string): Promise<Partial<InfrastructureEntity>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createOrganization', description })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.organization;
  }
}