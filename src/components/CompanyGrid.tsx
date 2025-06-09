import React, { useState, useEffect } from 'react';
import { CompanyMemoryRecord, InfrastructureEntity, EntityType, FidelityLevel } from '../types/infrastructure';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';

const complexityIcons: Record<string, string> = {
  simple: '🟢',
  moderate: '🟡',
  complex: '🔴'
};

// Helper function to map sector tags to industry colors
const getSectorColor = (sectorTags: string[]): string => {
  const firstTag = sectorTags[0]?.toLowerCase() || '';
  if (firstTag.includes('bank') || firstTag.includes('fintech')) return 'border-blue-500';
  if (firstTag.includes('logistics') || firstTag.includes('delivery')) return 'border-green-500';
  if (firstTag.includes('defense') || firstTag.includes('security')) return 'border-red-500';
  if (firstTag.includes('tech') || firstTag.includes('ai')) return 'border-yellow-500';
  if (firstTag.includes('public') || firstTag.includes('government')) return 'border-gray-500';
  return 'border-purple-500'; // default
};

// Helper function to infer complexity from services/tags
const inferComplexity = (record: CompanyMemoryRecord): string => {
  const serviceCount = record.services.length;
  const tagCount = record.sectorTags.length;
  const totalComplexity = serviceCount + tagCount;
  
  if (totalComplexity <= 3) return 'simple';
  if (totalComplexity <= 6) return 'moderate';
  return 'complex';
};

interface CompanyGridProps {
  onCompanyClick: (entity: InfrastructureEntity) => void;
}

export const CompanyGrid: React.FC<CompanyGridProps> = ({ onCompanyClick }) => {
  const [filter, setFilter] = useState('');
  const [companies, setCompanies] = useState<CompanyMemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const vectorService = new ClientVectorMemoryService();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const allCompanies = await vectorService.getAllCompaniesFromMemory();
      
      // If no companies exist, populate with sample data
      if (allCompanies.length === 0) {
        await populateSampleCompanies();
        const newCompanies = await vectorService.getAllCompaniesFromMemory();
        setCompanies(newCompanies);
      } else {
        setCompanies(allCompanies);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError('Failed to load companies from vector database');
    } finally {
      setLoading(false);
    }
  };

  const populateSampleCompanies = async () => {
    const sampleCompanies = [
      {
        name: 'FinTech Bank',
        description: 'A leading bank specializing in digital payments and financial services.',
        sectorTags: ['🏦 Banking', '💳 FinTech', '💰 Payments'],
        services: ['Digital Banking', 'Payment Processing', 'Financial Analytics', 'Customer Management'],
        metadata: { industry: 'banking', complexity: 'complex', compliance: ['GDPR', 'PCI-DSS'] }
      },
      {
        name: 'LogiChain',
        description: 'A logistics company optimizing supply chains with AI.',
        sectorTags: ['🚚 Logistics', '🤖 AI', '📦 Supply Chain'],
        services: ['Supply Chain Management', 'AI Optimization', 'Delivery Tracking', 'Warehouse Management'],
        metadata: { industry: 'logistics', complexity: 'moderate', compliance: ['ISO 27001'] }
      },
      {
        name: 'DefenseNet',
        description: 'A defense contractor specializing in secure communications.',
        sectorTags: ['🛡️ Defense', '🔒 Security', '📡 Communications'],
        services: ['Secure Communications', 'Defense Systems', 'Encryption Services', 'Network Security'],
        metadata: { industry: 'defense', complexity: 'complex', compliance: ['ITAR'] }
      },
      {
        name: 'TechNova',
        description: 'A tech startup building next-gen AI solutions.',
        sectorTags: ['💻 Technology', '🤖 AI', '🚀 Startup'],
        services: ['AI Solutions', 'Software Development', 'Machine Learning'],
        metadata: { industry: 'tech', complexity: 'simple', compliance: [] }
      },
      {
        name: 'PublicWorks',
        description: 'A public sector organization managing infrastructure projects.',
        sectorTags: ['🏢 Public Sector', '🏗️ Infrastructure', '🏛️ Government'],
        services: ['Infrastructure Management', 'Public Services', 'Project Management', 'Citizen Services'],
        metadata: { industry: 'public', complexity: 'moderate', compliance: ['GDPR'] }
      }
    ];

    for (const company of sampleCompanies) {
      await vectorService.addCompanyToMemory(company);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.sectorTags.some(tag => tag.toLowerCase().includes(filter.toLowerCase())) ||
    company.services.some(service => service.toLowerCase().includes(filter.toLowerCase())) ||
    company.name.toLowerCase().includes(filter.toLowerCase()) ||
    company.description.toLowerCase().includes(filter.toLowerCase())
  );

  const convertCompanyToEntity = (company: CompanyMemoryRecord): InfrastructureEntity => {
    return {
      id: company.id,
      type: EntityType.ORGANIZATION,
      name: company.name,
      hostname: `${company.name.toLowerCase().replace(/\s+/g, '')}.local`,
      ip: '192.168.1.1',
      fidelity: FidelityLevel.VIRTUAL,
      ports: [],
      metadata: {
        description: company.description,
        coreFunctions: company.services,
        compliance: company.metadata?.compliance || [],
        industry: company.metadata?.industry,
        complexity: company.metadata?.complexity || inferComplexity(company),
        sectorTags: company.sectorTags,
        internalEntities: []
      },
      position: { x: 400, y: 300 },
      connections: [],
      logs: [],
    };
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-xl text-gray-400">Loading companies from vector database...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl text-gray-400 mb-2">Error</h3>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={loadCompanies}
            className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-400 mb-4">Company Infrastructure Explorer</h1>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Filter by company name, tags, services, or description..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400"
          />
          <button
            onClick={loadCompanies}
            className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            title="Refresh companies"
          >
            🔄
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Showing {filteredCompanies.length} of {companies.length} companies from vector database
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map(company => {
          const complexity = company.metadata?.complexity || inferComplexity(company);
          const compliance = company.metadata?.compliance || [];
          
          return (
            <div
              key={company.id}
              className={`p-6 border-2 rounded-lg shadow-lg bg-gray-800 ${getSectorColor(company.sectorTags)} hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105`}
              onClick={() => onCompanyClick(convertCompanyToEntity(company))}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-4xl">
                  {complexityIcons[complexity]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{company.name}</h2>
                  <p className="text-sm text-gray-400">
                    {company.sectorTags.slice(0, 2).join(' • ')}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-300 mb-4 text-sm leading-relaxed">{company.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {company.services.slice(0, 4).map(service => (
                  <span
                    key={service}
                    className="px-3 py-1 text-xs bg-gray-700 text-cyan-300 rounded-full border border-gray-600"
                  >
                    {service}
                  </span>
                ))}
                {company.services.length > 4 && (
                  <span className="px-3 py-1 text-xs bg-gray-600 text-gray-300 rounded-full">
                    +{company.services.length - 4} more
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {compliance.map((comp: string) => (
                    <span
                      key={comp}
                      className="px-2 py-1 text-xs bg-cyan-900 text-cyan-200 rounded-full border border-cyan-700"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    {complexity} complexity
                  </span>
                  <div className="px-3 py-1 text-xs bg-cyan-600 text-white rounded-lg">
                    Explore →
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl text-gray-400 mb-2">No companies found</h3>
          <p className="text-gray-500">
            {companies.length === 0 
              ? "No companies in the vector database yet" 
              : "Try adjusting your search filter"
            }
          </p>
        </div>
      )}
    </div>
  );
};