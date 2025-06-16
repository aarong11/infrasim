import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  onCompanyClick?: (entity: InfrastructureEntity) => void; // Make optional for backward compatibility
}

export const CompanyGrid: React.FC<CompanyGridProps> = ({ onCompanyClick }) => {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [companies, setCompanies] = useState<CompanyMemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const companiesPerPage = 9;
  
  const vectorService = new ClientVectorMemoryService();

  useEffect(() => {
    loadCompanies();
  }, []);

  // Ensure page starts at top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredCompanies.length / companiesPerPage);
  const startIndex = (currentPage - 1) * companiesPerPage;
  const endIndex = startIndex + companiesPerPage;
  const currentCompanies = filteredCompanies.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleCompanyClick = async (company: CompanyMemoryRecord) => {
    // Navigate to company dashboard instead of direct infrastructure view
    router.push(`/company/${company.id}/dashboard`);
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
    <div className="p-6 bg-gray-900 min-h-[calc(100vh-4rem)] text-white">
      {/* Filter Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search companies by name, tags, or services..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Results info */}
      {filteredCompanies.length > 0 && (
        <div className="mb-4 text-sm text-gray-400">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredCompanies.length)} of {filteredCompanies.length} companies
          {totalPages > 1 && (
            <span className="ml-2">
              (Page {currentPage} of {totalPages})
            </span>
          )}
        </div>
      )}

      {/* Company Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {currentCompanies.map(company => {
          const complexity = company.metadata?.complexity || inferComplexity(company);
          const compliance = company.metadata?.compliance || [];
          
          return (
            <div
              key={company.id}
              className={`p-6 border-2 rounded-lg shadow-lg bg-gray-800 ${getSectorColor(company.sectorTags)} hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 w-full h-72 flex flex-col`}
              onClick={() => handleCompanyClick(company)}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-4xl">
                  {complexityIcons[complexity]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{company.name}</h2>
                  <p className="text-sm text-gray-400 truncate">
                    {company.sectorTags.slice(0, 2).join(' • ')}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-300 mb-4 text-sm leading-relaxed flex-1 overflow-hidden"
                 style={{
                   display: '-webkit-box',
                   WebkitLineClamp: 3,
                   WebkitBoxOrient: 'vertical',
                   textOverflow: 'ellipsis'
                 }}
              >
                {company.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4 min-h-[2rem]">
                {company.services.slice(0, 4).map(service => (
                  <span
                    key={service}
                    className="px-3 py-1 text-xs bg-gray-700 text-cyan-300 rounded-full border border-gray-600 truncate"
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
              
              <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-wrap gap-1 flex-1 mr-2">
                  {compliance.map((comp: string) => (
                    <span
                      key={comp}
                      className="px-2 py-1 text-xs bg-cyan-900 text-cyan-200 rounded-full border border-cyan-700 truncate"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 truncate">
                    {complexity}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed text-white rounded border border-gray-600 disabled:border-gray-800 transition-colors"
          >
            ← Previous
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded transition-colors ${
                  page === currentPage
                    ? 'bg-cyan-600 text-white border border-cyan-500'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed text-white rounded border border-gray-600 disabled:border-gray-800 transition-colors"
          >
            Next →
          </button>
        </div>
      )}

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