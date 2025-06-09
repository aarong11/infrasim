// Fixed version of VectorMemoryManager with dynamic FAISS import and server-only safeguards

import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { Document } from "@langchain/core/documents";
import { CompanyMemoryRecord, VectorSearchResult } from '../types/infrastructure';
import * as fs from 'fs';
import * as path from 'path';

let instance: VectorMemoryManager | null = null;

export class VectorMemoryManager {
  private static initializationPromise: Promise<void> | null = null;

  private embeddings: OllamaEmbeddings;
  private vectorStore: any = null; // Avoid early static import
  private FaissStore: any = null; // Lazy FAISS loader

  private storePath: string;
  private isInitialized = false;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    this.embeddings = new OllamaEmbeddings({
      baseUrl: ollamaBaseUrl,
      model: "llama3.2:latest",
    });
    this.storePath = path.join(process.cwd(), 'data', 'vector-store');
    this.ensureDataDirectory();
  }

  static getInstance(ollamaBaseUrl: string = 'http://localhost:11434'): VectorMemoryManager {
    if (!instance) {
      instance = new VectorMemoryManager(ollamaBaseUrl);
    }
    return instance;
  }

  private ensureDataDirectory() {
    // Only run in Node.js
    if (typeof window !== 'undefined') {
      console.warn('VectorMemoryManager: skipping filesystem ops in browser.');
      return;
    }

    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
      console.log(`✅ Created vector memory directory: ${this.storePath}`);
    }
  }

  private async ensureFaiss(): Promise<void> {
    if (!this.FaissStore) {
      const mod = await import('@langchain/community/vectorstores/faiss');
      this.FaissStore = mod.FaissStore;
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
    await this.ensureFaiss();

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
    const faissPath = path.join(this.storePath, 'faiss.index');
    const docstorePath = path.join(this.storePath, 'docstore.json');

    if (fs.existsSync(faissPath) && fs.existsSync(docstorePath)) {
      this.vectorStore = await this.FaissStore.load(this.storePath, this.embeddings);
    } else {
      throw new Error('Vector store files not found');
    }
  }

  private async createEmptyVectorStore(): Promise<void> {
    const dummyDoc = new Document({
      pageContent: "initial document",
      metadata: { id: "init", isInit: true }
    });

    this.vectorStore = await this.FaissStore.fromDocuments([dummyDoc], this.embeddings);
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
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }
    });

    await this.vectorStore!.addDocuments([document]);
    await this.saveVectorStore();
  }

  public async updateCompanyRecord(record: CompanyMemoryRecord): Promise<void> {
    record.updatedAt = new Date();
    await this.addCompanyRecord(record);
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
      createdAt: new Date(doc.metadata.createdAt),
      updatedAt: new Date(doc.metadata.updatedAt),
    };
  }
}
