import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CompanyProfile } from './types';

export class CompanyDatabase {
  private dbPath: string;
  private companies: Record<string, CompanyProfile> = {};
  
  constructor(dbPath: string = path.join(process.cwd(), 'data', 'companies.json')) {
    this.dbPath = dbPath;
    this.ensureDbExists();
    this.loadDatabase();
  }
  
  private ensureDbExists(): void {
    const dirPath = path.dirname(this.dbPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify({ companies: {} }));
    }
  }
  
  private loadDatabase(): void {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.companies = parsed.companies || {};
    } catch (error) {
      console.error('Error loading companies database:', error);
      this.companies = {};
    }
  }
  
  private saveDatabase(): void {
    try {
      const dirPath = path.dirname(this.dbPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, JSON.stringify({ companies: this.companies }, null, 2));
    } catch (error) {
      console.error('Error saving companies database:', error);
    }
  }
  
  public saveCompany(company: CompanyProfile): CompanyProfile {
    if (!company.id) {
      company.id = uuidv4();
    }
    
    const now = new Date().toISOString();
    if (!company.createdAt) {
      company.createdAt = now;
    }
    company.updatedAt = now;
    
    this.companies[company.id] = company;
    this.saveDatabase();
    
    return company;
  }
  
  public getCompanyById(id: string): CompanyProfile | null {
    return this.companies[id] || null;
  }
  
  public getAllCompanies(): CompanyProfile[] {
    return Object.values(this.companies).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  
  public updateCompany(id: string, updates: Partial<CompanyProfile>): CompanyProfile | null {
    if (!this.companies[id]) {
      return null;
    }
    
    const updatedCompany = {
      ...this.companies[id],
      ...updates,
      id, // Ensure id doesn't change
      updatedAt: new Date().toISOString()
    };
    
    this.companies[id] = updatedCompany;
    this.saveDatabase();
    
    return updatedCompany;
  }
  
  public deleteCompany(id: string): boolean {
    if (!this.companies[id]) {
      return false;
    }
    
    delete this.companies[id];
    this.saveDatabase();
    
    return true;
  }
}