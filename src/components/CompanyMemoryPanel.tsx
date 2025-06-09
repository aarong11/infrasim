import React, { useState, useEffect } from 'react';
import { CompanyMemoryRecord, VectorSearchResult } from '../types/infrastructure';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';

interface CompanyMemoryPanelProps {
  vectorService: ClientVectorMemoryService;
  onCompanySelect?: (company: CompanyMemoryRecord) => void;
}

export const CompanyMemoryPanel: React.FC<CompanyMemoryPanelProps> = ({
  vectorService,
  onCompanySelect
}) => {
  const [companies, setCompanies] = useState<CompanyMemoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    description: '',
    sectorTags: '',
    services: '',
  });

  useEffect(() => {
    loadAllCompanies();
  }, []);

  const loadAllCompanies = async () => {
    try {
      const allCompanies = await vectorService.getAllCompaniesFromMemory();
      setCompanies(allCompanies);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await vectorService.searchCompaniesInMemory(searchQuery, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setIsSearching(false);
  };

  const handleAddCompany = async () => {
    if (!newCompany.name.trim() || !newCompany.description.trim()) {
      return;
    }

    try {
      await vectorService.addCompanyToMemory({
        name: newCompany.name,
        description: newCompany.description,
        sectorTags: newCompany.sectorTags.split(',').map(tag => tag.trim()).filter(Boolean),
        services: newCompany.services.split(',').map(service => service.trim()).filter(Boolean),
        metadata: {}
      });

      setNewCompany({ name: '', description: '', sectorTags: '', services: '' });
      setShowAddForm(false);
      loadAllCompanies();
    } catch (error) {
      console.error('Failed to add company:', error);
    }
  };

  const getSimilarCompanies = async (companyId: string) => {
    try {
      const similar = await vectorService.findSimilarCompanies(companyId, 5);
      console.log('Similar companies:', similar);
    } catch (error) {
      console.error('Failed to find similar companies:', error);
    }
  };

  const displayResults = searchQuery.trim() ? searchResults : companies.map(company => ({
    record: company,
    score: 0,
    similarity: 1
  }));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyan-400">🧠 Company Memory</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded text-sm"
        >
          + Add Company
        </button>
      </div>

      {/* Add Company Form */}
      {showAddForm && (
        <div className="bg-gray-900 border border-gray-600 rounded p-3 space-y-3">
          <h4 className="text-sm font-semibold text-gray-300">Add New Company</h4>
          <input
            type="text"
            placeholder="Company name"
            value={newCompany.name}
            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
          <textarea
            placeholder="Company description"
            value={newCompany.description}
            onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white h-20"
          />
          <input
            type="text"
            placeholder="Sector tags (comma-separated)"
            value={newCompany.sectorTags}
            onChange={(e) => setNewCompany({ ...newCompany, sectorTags: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
          <input
            type="text"
            placeholder="Services (comma-separated)"
            value={newCompany.services}
            onChange={(e) => setNewCompany({ ...newCompany, services: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
          <div className="flex space-x-2">
            <button
              onClick={handleAddCompany}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              Save
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search Interface */}
      <div className="space-y-2">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search companies (e.g., 'logistics with 3+ services', 'AI companies')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
          >
            {isSearching ? '🔍' : 'Search'}
          </button>
        </div>
        
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
            className="text-xs text-gray-400 hover:text-white"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <div className="text-sm text-gray-400">
          {searchQuery ? `Search results (${displayResults.length})` : `All companies (${companies.length})`}
        </div>
        
        {displayResults.map((result) => (
          <div
            key={result.record.id}
            className="bg-gray-700 border border-gray-600 rounded p-3 cursor-pointer hover:bg-gray-600 transition-colors"
            onClick={() => onCompanySelect?.(result.record)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-white">{result.record.name}</h4>
                <p className="text-sm text-gray-300 mt-1">{result.record.description}</p>
                
                {result.record.sectorTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.record.sectorTags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-600 text-xs px-2 py-1 rounded text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {result.record.services.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Services: {result.record.services.join(', ')}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end space-y-1">
                {searchQuery && (
                  <div className="text-xs text-cyan-400">
                    {Math.round(result.similarity * 100)}% match
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    getSimilarCompanies(result.record.id);
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Find similar
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {displayResults.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            {searchQuery ? 'No companies found matching your search' : 'No companies in memory yet'}
          </div>
        )}
      </div>
    </div>
  );
};