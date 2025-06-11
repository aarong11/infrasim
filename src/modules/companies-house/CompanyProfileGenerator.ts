import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { CompanyProfile } from './types';

// Zod schema for company profile generation
const CompanyProfileSchema = z.object({
  name: z.string().describe('Company name (inferred if not explicitly stated)'),
  sector: z.string().describe('Business sector (e.g. Banking, Healthcare, Social Media, Technology)'),
  coreFunctions: z.array(z.string()).min(3).max(6).describe('Core services or functions the company provides'),
  regulatoryRequirements: z.array(z.string()).describe('Applicable regulatory frameworks (e.g. GDPR, PCI-DSS, HIPAA)')
});

export class CompanyProfileGenerator {
  private llm: ChatOllama;
  private profileParser: StructuredOutputParser<any>;

  constructor(ollamaBaseUrl: string = 'http://localhost:11434') {
    this.llm = new ChatOllama({
      baseUrl: ollamaBaseUrl,
      model: 'smangrul/llama-3-8b-instruct-function-calling',
      temperature: 0.1,
    });

    // Create structured output parser
    this.profileParser = StructuredOutputParser.fromZodSchema(CompanyProfileSchema);
  }

  public async generateCompanyProfile(description: string, name?: string): Promise<CompanyProfile> {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log('📤 CompanyProfileGenerator Request [Structured Output + Zod]', {
      requestId,
      description: description.substring(0, 100) + '...',
      model: 'smangrul/llama-3-8b-instruct-function-calling',
      timestamp: new Date().toISOString()
    });

    try {
      const startTime = Date.now();
      
      const prompt = PromptTemplate.fromTemplate(`
You are a business analyst specializing in company infrastructure. Generate structured company profiles with appropriate regulatory requirements based on the business sector.

Company Description: {description}

{format_instructions}

Respond only with valid JSON, no additional text:
`);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        this.profileParser
      ]);

      const result = await chain.invoke({
        description,
        format_instructions: this.profileParser.getFormatInstructions()
      });

      const duration = Date.now() - startTime;

      // Validate with Zod
      const parsed = CompanyProfileSchema.parse(result);
      
      console.log('✅ CompanyProfileGenerator Success [Structured Output + Zod]', {
        requestId,
        duration: `${duration}ms`,
        generatedName: parsed.name,
        sector: parsed.sector,
        coreFunctionsCount: parsed.coreFunctions.length,
        regulatoryCount: parsed.regulatoryRequirements.length,
        validation: 'passed',
        timestamp: new Date().toISOString()
      });

      const now = new Date().toISOString();
      const id = uuidv4();
      
      return {
        id,
        name: name || parsed.name,
        description,
        sector: parsed.sector,
        coreFunctions: parsed.coreFunctions,
        regulatoryRequirements: parsed.regulatoryRequirements,
        infrastructure: [], // Will be populated by InfrastructureBuilder
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('❌ CompanyProfileGenerator Failed [Structured Output + Zod]', {
        requestId,
        error: error.message,
        description: description.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
      
      // Fallback profile with rule-based inference
      const now = new Date().toISOString();
      const id = uuidv4();
      
      const fallbackProfile = {
        id,
        name: name || `Company-${id.substring(0, 8)}`,
        description,
        sector: this.inferSector(description),
        coreFunctions: this.inferCoreFunctions(description),
        regulatoryRequirements: this.inferRegulatoryRequirements(description),
        infrastructure: [],
        createdAt: now,
        updatedAt: now,
      };

      console.log('🔄 CompanyProfileGenerator Fallback Used', {
        requestId,
        fallbackProfile: {
          name: fallbackProfile.name,
          sector: fallbackProfile.sector,
          coreFunctions: fallbackProfile.coreFunctions.length
        },
        timestamp: new Date().toISOString()
      });

      return fallbackProfile;
    }
  }

  private inferSector(description: string): string {
    const description_lower = description.toLowerCase();
    if (description_lower.includes('bank') || description_lower.includes('payment')) {
      return 'Banking';
    } else if (description_lower.includes('health') || description_lower.includes('hospital')) {
      return 'Healthcare';
    } else if (description_lower.includes('social') || description_lower.includes('media')) {
      return 'Social Media';
    } else if (description_lower.includes('retail') || description_lower.includes('shop')) {
      return 'Retail';
    } else if (description_lower.includes('defense') || description_lower.includes('military')) {
      return 'Defense';
    } else if (description_lower.includes('logistics') || description_lower.includes('shipping')) {
      return 'Logistics';
    }
    return 'Technology';
  }

  private inferCoreFunctions(description: string): string[] {
    const description_lower = description.toLowerCase();
    const functions: string[] = ['Customer Management'];
    
    if (description_lower.includes('payment')) {
      functions.push('Payment Processing');
    }
    if (description_lower.includes('onboarding')) {
      functions.push('Customer Onboarding');
    }
    if (description_lower.includes('api')) {
      functions.push('API Services');
    }
    if (description_lower.includes('data')) {
      functions.push('Data Management');
    }
    if (description_lower.includes('security')) {
      functions.push('Security Services');
    }
    
    return functions;
  }

  private inferRegulatoryRequirements(description: string): string[] {
    const description_lower = description.toLowerCase();
    const requirements: string[] = [];
    
    // Banking/Financial regulations
    if (description_lower.includes('bank') || description_lower.includes('payment') || description_lower.includes('financial')) {
      requirements.push('PCI-DSS', 'SOX', 'Basel III');
    }
    
    // Healthcare regulations
    if (description_lower.includes('health') || description_lower.includes('medical') || description_lower.includes('patient')) {
      requirements.push('HIPAA', 'FDA', 'GDPR');
    }
    
    // General data protection
    if (description_lower.includes('data') || description_lower.includes('customer') || description_lower.includes('personal')) {
      requirements.push('GDPR', 'CCPA');
    }
    
    // Defense/Government
    if (description_lower.includes('defense') || description_lower.includes('government') || description_lower.includes('classified')) {
      requirements.push('FISMA', 'NIST', 'FedRAMP');
    }

    // Default compliance requirements
    if (requirements.length === 0) {
      requirements.push('GDPR', 'ISO 27001');
    }
    
    return requirements;
  }
}