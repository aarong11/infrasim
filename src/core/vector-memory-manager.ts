import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { Document } from "@langchain/core/documents";
import { CompanyMemoryRecord, VectorSearchResult } from '../types/infrastructure';
import * as fs from 'fs';
import * as path from 'path';

let instance: VectorMemoryManager | null = null;

export class VectorMemoryManager {
  private static initializationPromise: Promise<void> | null = null;
  private embeddings: OllamaEmbeddings;
  private vectorStore: any = null;
  private storePath: string;
  private isInitialized = false;

  constructor(ollamaBaseUrl: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434') {
    this.embeddings = new OllamaEmbeddings({
      baseUrl: ollamaBaseUrl,
      model: "nomic-embed-text:latest", // Use proper embedding model
    });
    
    if (typeof window === 'undefined') {
      this.storePath = path.join(process.cwd(), 'data', 'vector-store');
      this.ensureDataDirectory();
    }
  }

  static getInstance(ollamaBaseUrl: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'): VectorMemoryManager {
    if (!instance) {
      instance = new VectorMemoryManager(ollamaBaseUrl);
    }
    return instance;
  }

  private ensureDataDirectory() {
    if (typeof window !== 'undefined') {
      console.warn('VectorMemoryManager: skipping filesystem ops in browser.');
      return;
    }
    
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
      console.log(`✅ Created vector memory directory: ${this.storePath}`);
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (VectorMemoryManager.initializationPromise) {
      await VectorMemoryManager.initializationPromise;
      return;
    }

    VectorMemoryManager.initializationPromise = this.doInitialize();
    await VectorMemoryManager.initializationPromise;
    VectorMemoryManager.initializationPromise = null;
  }

  private async doInitialize(): Promise<void> {
    console.log('🚀 Vector Memory Manager initializing...');

    try {
      await this.loadVectorStore();
      console.log('✅ Vector store loaded from disk');
    } catch (error) {
      console.log('📝 Creating new vector store...');
      await this.createEmptyVectorStore();
      console.log('✅ New vector store created');
    }

    this.isInitialized = true;
  }

  private async loadVectorStore(): Promise<void> {
    if (typeof window !== 'undefined') return;
    
    const faissPath = path.join(this.storePath, 'faiss.index');
    const docstorePath = path.join(this.storePath, 'docstore.json');
    
    if (fs.existsSync(faissPath) && fs.existsSync(docstorePath)) {
      this.vectorStore = await FaissStore.load(this.storePath, this.embeddings);
    } else {
      throw new Error('Vector store files not found');
    }
  }

  private async createEmptyVectorStore(): Promise<void> {
    const dummyDoc = new Document({
      pageContent: "initial document",
      metadata: { id: "init", isInit: true }
    });

    this.vectorStore = await FaissStore.fromDocuments([dummyDoc], this.embeddings);
    await this.saveVectorStore();
  }

  private async saveVectorStore(): Promise<void> {
    if (this.vectorStore) {
      await this.vectorStore.save(this.storePath);
    }
  }

  public async addCompanyRecord(record: CompanyMemoryRecord): Promise<void> {
    await this.initialize();

    const content = this.createSearchableContent(record);
    const document = new Document({
      pageContent: content,
      metadata: {
        ...record,
        createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
        updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
      }
    });

    await this.vectorStore!.addDocuments([document]);
    await this.saveVectorStore();
  }

  public async updateCompanyRecord(record: CompanyMemoryRecord): Promise<void> {
    await this.initialize();
    
    record.updatedAt = new Date();
    
    try {
      const allCompanies = await this.getAllCompanies();
      const updatedCompanies = allCompanies.filter(c => c.id !== record.id);
      updatedCompanies.push(record);
      
      await this.recreateVectorStoreWithCompanies(updatedCompanies);
      
      console.log(`✅ Updated company record: ${record.name} (ID: ${record.id})`);
    } catch (error) {
      console.error('Failed to update company record:', error);
      await this.addCompanyRecord(record);
    }
  }

  private async recreateVectorStoreWithCompanies(companies: CompanyMemoryRecord[]): Promise<void> {
    await this.recreateVectorStore();
    
    for (const company of companies) {
      const content = this.createSearchableContent(company);
      const document = new Document({
        pageContent: content,
        metadata: {
          ...company,
          createdAt: company.createdAt instanceof Date ? company.createdAt.toISOString() : company.createdAt,
          updatedAt: company.updatedAt instanceof Date ? company.updatedAt.toISOString() : company.updatedAt,
        }
      });
      await this.vectorStore!.addDocuments([document]);
    }
    
    await this.saveVectorStore();
  }

  public async searchCompanies(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    await this.initialize();

    try {
      const results = await this.vectorStore!.similaritySearchWithScore(query, limit);
      return results
        .filter(([doc, _]) => !doc.metadata.isInit)
        .map(([doc, score]) => ({
          record: this.documentToRecord(doc),
          score,
          similarity: 1 - score
        }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Query vector must have the same length')) {
        await this.recreateVectorStore();
        return [];
      }
      throw error;
    }
  }

  public async findSimilarCompanies(companyId: string, limit: number = 5): Promise<VectorSearchResult[]> {
    await this.initialize();

    const allResults = await this.vectorStore!.similaritySearchWithScore("", 100);
    const target = allResults.find(([doc]) => doc.metadata.id === companyId);
    if (!target) throw new Error(`Company with ID ${companyId} not found`);

    const content = target[0].pageContent;
    const results = await this.vectorStore!.similaritySearchWithScore(content, limit + 1);

    return results
      .filter(([doc]) => doc.metadata.id !== companyId && !doc.metadata.isInit)
      .slice(0, limit)
      .map(([doc, score]) => ({
        record: this.documentToRecord(doc),
        score,
        similarity: 1 - score
      }));
  }

  public async getAllCompanies(): Promise<CompanyMemoryRecord[]> {
    await this.initialize();

    try {
      const results = await this.vectorStore!.similaritySearch("", 1000);
      return results
        .filter(doc => !doc.metadata.isInit)
        .map(doc => this.documentToRecord(doc));
    } catch (error) {
      console.warn('⚠️ getAllCompanies failed, using backup:', error);
      return await this.backupCompanyData();
    }
  }

  private async backupCompanyData(): Promise<CompanyMemoryRecord[]> {
    if (typeof window !== 'undefined') return [];
    
    try {
      const docstorePath = path.join(this.storePath, 'docstore.json');
      if (!fs.existsSync(docstorePath)) return [];
      
      const docstore = JSON.parse(fs.readFileSync(docstorePath, 'utf8'));
      const companies: CompanyMemoryRecord[] = [];
      
      if (Array.isArray(docstore) && Array.isArray(docstore[0])) {
        for (const [id, docData] of docstore[0]) {
          if (docData?.metadata && !docData.metadata.isInit) {
            companies.push({
              id: docData.metadata.id,
              name: docData.metadata.name,
              description: docData.metadata.description,
              sectorTags: docData.metadata.sectorTags || [],
              services: docData.metadata.services || [],
              metadata: docData.metadata.metadata || {},
              infrastructure: docData.metadata.infrastructure,
              daoContractAddress: docData.metadata.daoContractAddress,
              createdAt: new Date(docData.metadata.createdAt),
              updatedAt: new Date(docData.metadata.updatedAt)
            });
          }
        }
      }
      return companies;
    } catch (err) {
      console.error('Backup read error:', err);
      return [];
    }
  }

  private async recreateVectorStore(): Promise<void> {
    if (typeof window !== 'undefined') return;
    
    const faissPath = path.join(this.storePath, 'faiss.index');
    const docstorePath = path.join(this.storePath, 'docstore.json');
    
    try {
      if (fs.existsSync(faissPath)) fs.unlinkSync(faissPath);
      if (fs.existsSync(docstorePath)) fs.unlinkSync(docstorePath);
    } catch (err) {
      console.error('Error deleting vector store files:', err);
    }
    
    await this.createEmptyVectorStore();
  }

  private createSearchableContent(record: CompanyMemoryRecord): string {
    return `${record.name} ${record.description} ${record.sectorTags.join(' ')} ${record.services.join(' ')} ${Object.values(record.metadata || {}).join(' ')}`.toLowerCase();
  }

  private documentToRecord(doc: Document): CompanyMemoryRecord {
    return {
      id: doc.metadata.id,
      name: doc.metadata.name,
      description: doc.metadata.description,
      sectorTags: doc.metadata.sectorTags || [],
      services: doc.metadata.services || [],
      metadata: doc.metadata.metadata || {},
      infrastructure: doc.metadata.infrastructure,
      daoContractAddress: doc.metadata.daoContractAddress,
      createdAt: new Date(doc.metadata.createdAt),
      updatedAt: new Date(doc.metadata.updatedAt),
    };
  }
}
