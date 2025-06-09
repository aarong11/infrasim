'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, PlayIcon, BookmarkIcon, StarIcon } from '@heroicons/react/24/outline';

interface ApiRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: Record<string, string>;
  body: string;
  category: string;
  isFavorite?: boolean;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  responseTime: number;
}

interface Variable {
  key: string;
  value: string;
  description: string;
}

const DEFAULT_VARIABLES: Variable[] = [
  { key: 'baseUrl', value: 'http://localhost:3000', description: 'Base URL for the API' },
  { key: 'companyId', value: '', description: 'Company ID from previous requests' },
  { key: 'timestamp', value: '', description: 'Current timestamp' },
  { key: 'randomCompanyName', value: '', description: 'Random company name' },
];

const PRELOADED_REQUESTS: ApiRequest[] = [
  {
    id: 'add-company',
    name: 'Add Company',
    method: 'POST',
    url: '{{baseUrl}}/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'addCompany',
      company: {
        name: '{{randomCompanyName}}',
        description: 'A sample company for testing vector memory operations',
        sectorTags: ['💻 Technology', '🤖 AI', '🚀 Startup'],
        services: ['AI Solutions', 'Software Development', 'Machine Learning'],
        metadata: {
          industry: 'tech',
          complexity: 'simple',
          compliance: ['ISO 27001'],
          employees: 85,
          founded: 2022
        }
      }
    }, null, 2),
    category: 'Company Management'
  },
  {
    id: 'update-company',
    name: 'Update Company',
    method: 'POST',
    url: '{{baseUrl}}/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'updateCompany',
      company: {
        id: '{{companyId}}',
        name: 'Updated Company Name',
        description: 'Updated description with new information',
        sectorTags: ['💻 Technology', '🤖 AI', '📊 Analytics'],
        services: ['AI Solutions', 'Data Analytics', 'Machine Learning', 'Consulting'],
        metadata: {
          industry: 'tech',
          complexity: 'moderate',
          compliance: ['ISO 27001', 'GDPR'],
          employees: 120,
          founded: 2020
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '{{timestamp}}'
      }
    }, null, 2),
    category: 'Company Management'
  },
  {
    id: 'search-companies',
    name: 'Search Companies by Query',
    method: 'POST',
    url: '{{baseUrl}}/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'searchCompanies',
      query: 'AI technology startup',
      limit: 5
    }, null, 2),
    category: 'Search & Discovery'
  },
  {
    id: 'find-similar-companies',
    name: 'Find Similar Companies',
    method: 'POST',
    url: '{{baseUrl}}/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'findSimilarCompanies',
      companyId: '{{companyId}}',
      limit: 5
    }, null, 2),
    category: 'Search & Discovery'
  },
  {
    id: 'get-all-companies',
    name: 'Get All Companies',
    method: 'POST',
    url: '{{baseUrl}}/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getAllCompanies'
    }, null, 2),
    category: 'Data Retrieval'
  },
  {
    id: 'create-organization',
    name: 'Create Root Organization',
    method: 'POST',
    url: '{{baseUrl}}/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'createOrganization',
      description: 'A fintech startup providing digital banking solutions with AI-powered fraud detection and mobile payment processing'
    }, null, 2),
    category: 'Infrastructure Operations'
  },
  {
    id: 'parse-infrastructure',
    name: 'Parse Infrastructure Description',
    method: 'POST',
    url: '{{baseUrl}}/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'parseInfrastructure',
      description: 'A bank with web servers for customer portal, database servers for transaction data, firewall for security, and load balancers for high availability'
    }, null, 2),
    category: 'Infrastructure Operations'
  },
  {
    id: 'workflow-test',
    name: 'Complete Workflow Test',
    method: 'POST',
    url: '{{baseUrl}}/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'addCompany',
      company: {
        name: 'Workflow Test Corp {{timestamp}}',
        description: 'Healthcare technology company developing IoT medical devices and telemedicine platforms',
        sectorTags: ['🏥 Healthcare', '💻 Technology', '🌐 IoT', '🔬 Medical Devices'],
        services: ['Medical Device Development', 'Telemedicine Platform', 'IoT Health Monitoring'],
        metadata: {
          industry: 'healthcare',
          complexity: 'complex',
          compliance: ['HIPAA', 'FDA', 'ISO 13485']
        }
      }
    }, null, 2),
    category: 'Test Workflows'
  }
];

const METHOD_COLORS = {
  GET: 'bg-emerald-600 text-white border-emerald-500',
  POST: 'bg-blue-600 text-white border-blue-500',
  PUT: 'bg-amber-600 text-white border-amber-500',
  DELETE: 'bg-red-600 text-white border-red-500',
  PATCH: 'bg-purple-600 text-white border-purple-500'
};

export const DeveloperConsole: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<ApiRequest | null>(null);
  const [customRequest, setCustomRequest] = useState<ApiRequest>({
    id: 'custom',
    name: 'Custom Request',
    method: 'POST',
    url: 'http://localhost:3000/api/vector-memory',
    headers: { 'Content-Type': 'application/json' },
    body: '{\n  "action": "getAllCompanies"\n}',
    category: 'Custom'
  });
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [variables, setVariables] = useState<Variable[]>(DEFAULT_VARIABLES);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [showVariables, setShowVariables] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'form'>('raw');
  const [savedRequests, setSavedRequests] = useState<ApiRequest[]>([]);

  useEffect(() => {
    // Update timestamp variable
    setVariables(prev => prev.map(v => 
      v.key === 'timestamp' 
        ? { ...v, value: new Date().toISOString() }
        : v.key === 'randomCompanyName'
        ? { ...v, value: generateRandomCompanyName() }
        : v
    ));
  }, []);

  const generateRandomCompanyName = () => {
    const adjectives = ['Tech', 'Digital', 'Smart', 'Cyber', 'Cloud', 'Data', 'AI'];
    const nouns = ['Solutions', 'Systems', 'Labs', 'Works', 'Corp', 'Group', 'Industries'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  };

  const replaceVariables = (text: string): string => {
    let result = text;
    variables.forEach(variable => {
      const regex = new RegExp(`{{${variable.key}}}`, 'g');
      result = result.replace(regex, variable.value);
    });
    
    // Handle built-in Postman-style variables
    result = result.replace(/\{\{\$timestamp\}\}/g, Date.now().toString());
    result = result.replace(/\{\{\$isoTimestamp\}\}/g, new Date().toISOString());
    result = result.replace(/\{\{\$randomCompanyName\}\}/g, generateRandomCompanyName());
    
    return result;
  };

  const executeRequest = async (request: ApiRequest) => {
    setLoading(true);
    setResponse(null);
    
    const startTime = performance.now();
    
    try {
      const url = replaceVariables(request.url);
      const body = replaceVariables(request.body);
      
      const requestConfig: RequestInit = {
        method: request.method,
        headers: request.headers,
      };
      
      if (request.method !== 'GET' && body) {
        requestConfig.body = body;
      }
      
      const res = await fetch(url, requestConfig);
      const data = await res.json();
      const endTime = performance.now();
      
      const apiResponse: ApiResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data,
        responseTime: endTime - startTime
      };
      
      setResponse(apiResponse);
      
      // Extract companyId if present in response
      if (data.id) {
        setVariables(prev => prev.map(v => 
          v.key === 'companyId' ? { ...v, value: data.id } : v
        ));
      }
      
    } catch (error) {
      console.error('Request failed:', error);
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        responseTime: performance.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const saveRequest = (request: ApiRequest) => {
    const newRequest = { ...request, id: `saved-${Date.now()}`, isFavorite: true };
    setSavedRequests(prev => [...prev, newRequest]);
  };

  const groupedRequests = [...PRELOADED_REQUESTS, ...savedRequests].reduce((groups, request) => {
    const category = request.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(request);
    return groups;
  }, {} as Record<string, ApiRequest[]>);

  const activeRequest = selectedRequest || customRequest;

  return (
    <div className="h-full flex bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm">
      {/* Sidebar with request library - VS Code Explorer style */}
      <div className="w-80 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#2d2d30]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">API Console</h2>
            <button
              onClick={() => setShowVariables(!showVariables)}
              className="text-xs bg-[#0e639c] hover:bg-[#1177bb] text-white px-2 py-1 rounded transition-colors"
            >
              Variables
            </button>
          </div>
          
          {showVariables && (
            <div className="mb-3 space-y-2">
              <h3 className="text-xs font-medium text-[#cccccc] uppercase tracking-wide">Environment</h3>
              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-track-[#2d2d30] scrollbar-thumb-[#424242]">
                {variables.map((variable, index) => (
                  <div key={variable.key} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={variable.key}
                      onChange={(e) => setVariables(prev => prev.map((v, i) => 
                        i === index ? { ...v, key: e.target.value } : v
                      ))}
                      className="flex-1 bg-[#3c3c3c] border border-[#464647] rounded px-2 py-1 text-xs text-[#cccccc] focus:border-[#007acc] focus:outline-none"
                      placeholder="Key"
                    />
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => setVariables(prev => prev.map((v, i) => 
                        i === index ? { ...v, value: e.target.value } : v
                      ))}
                      className="flex-2 bg-[#3c3c3c] border border-[#464647] rounded px-2 py-1 text-xs text-[#cccccc] focus:border-[#007acc] focus:outline-none"
                      placeholder="Value"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Request library with custom scrollbar */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-[#2d2d30] scrollbar-thumb-[#424242] hover:scrollbar-thumb-[#4f4f4f]">
          {Object.entries(groupedRequests).map(([category, requests]) => (
            <div key={category} className="border-b border-[#3c3c3c] last:border-b-0">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-[#2a2d2e] transition-colors"
              >
                <span className="text-xs font-medium text-[#cccccc] uppercase tracking-wide">{category}</span>
                {collapsedCategories[category] ? (
                  <ChevronRightIcon className="w-3 h-3 text-[#cccccc]" />
                ) : (
                  <ChevronDownIcon className="w-3 h-3 text-[#cccccc]" />
                )}
              </button>
              
              {!collapsedCategories[category] && (
                <div className="pb-1">
                  {requests.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => setSelectedRequest(request)}
                      className={`w-full px-6 py-2 text-left hover:bg-[#2a2d2e] flex items-center gap-3 transition-colors ${
                        selectedRequest?.id === request.id ? 'bg-[#37373d] border-l-2 border-[#007acc]' : ''
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${METHOD_COLORS[request.method]}`}>
                        {request.method}
                      </span>
                      <span className="text-xs text-[#cccccc] truncate flex-1">{request.name}</span>
                      {request.isFavorite && (
                        <StarIcon className="w-3 h-3 text-yellow-400 fill-current flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="p-4">
            <button
              onClick={() => setSelectedRequest(null)}
              className={`w-full p-2 text-left hover:bg-[#2a2d2e] rounded transition-colors ${
                !selectedRequest ? 'bg-[#37373d] border-l-2 border-[#007acc]' : ''
              }`}
            >
              <span className="text-xs text-[#4fc1ff]">+ Custom Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        {/* Request configuration header */}
        <div className="border-b border-[#3c3c3c] p-4 space-y-4 bg-[#2d2d30]">
          <div className="flex items-center gap-4">
            <select
              value={activeRequest.method}
              onChange={(e) => {
                const newMethod = e.target.value as ApiRequest['method'];
                if (selectedRequest) {
                  setSelectedRequest({ ...selectedRequest, method: newMethod });
                } else {
                  setCustomRequest({ ...customRequest, method: newMethod });
                }
              }}
              className={`px-3 py-2 rounded font-bold text-xs border ${METHOD_COLORS[activeRequest.method]} focus:outline-none focus:ring-2 focus:ring-[#007acc]`}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            
            <input
              type="text"
              value={activeRequest.url}
              onChange={(e) => {
                const newUrl = e.target.value;
                if (selectedRequest) {
                  setSelectedRequest({ ...selectedRequest, url: newUrl });
                } else {
                  setCustomRequest({ ...customRequest, url: newUrl });
                }
              }}
              className="flex-1 bg-[#3c3c3c] border border-[#464647] rounded px-3 py-2 text-[#cccccc] focus:border-[#007acc] focus:outline-none font-mono"
              placeholder="Enter request URL"
            />
            
            <button
              onClick={() => executeRequest(activeRequest)}
              disabled={loading}
              className="bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#464647] disabled:text-[#858585] px-4 py-2 rounded flex items-center gap-2 transition-colors text-xs font-medium"
            >
              <PlayIcon className="w-4 h-4" />
              {loading ? 'Running...' : 'Send'}
            </button>
            
            <button
              onClick={() => saveRequest(activeRequest)}
              className="bg-[#464647] hover:bg-[#525252] px-3 py-2 rounded transition-colors"
              title="Save Request"
            >
              <BookmarkIcon className="w-4 h-4 text-[#cccccc]" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-[#3c3c3c] rounded border border-[#464647]">
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 rounded-l text-xs transition-colors ${
                  viewMode === 'raw' 
                    ? 'bg-[#0e639c] text-white' 
                    : 'text-[#cccccc] hover:bg-[#464647]'
                }`}
              >
                Raw JSON
              </button>
              <button
                onClick={() => setViewMode('form')}
                className={`px-3 py-1 rounded-r text-xs transition-colors ${
                  viewMode === 'form' 
                    ? 'bg-[#0e639c] text-white' 
                    : 'text-[#cccccc] hover:bg-[#464647]'
                }`}
              >
                Form UI
              </button>
            </div>
          </div>
        </div>

        {/* Request body and response */}
        <div className="flex-1 flex min-h-0">
          {/* Request body */}
          <div className="flex-1 border-r border-[#3c3c3c] p-4 flex flex-col">
            <h3 className="text-sm font-medium mb-3 text-[#cccccc] uppercase tracking-wide">Request Body</h3>
            <div className="flex-1 relative">
              <textarea
                value={activeRequest.body}
                onChange={(e) => {
                  const newBody = e.target.value;
                  if (selectedRequest) {
                    setSelectedRequest({ ...selectedRequest, body: newBody });
                  } else {
                    setCustomRequest({ ...customRequest, body: newBody });
                  }
                }}
                className="w-full h-full bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 font-mono text-sm text-[#d4d4d4] resize-none focus:border-[#007acc] focus:outline-none scrollbar-thin scrollbar-track-[#2d2d30] scrollbar-thumb-[#424242] hover:scrollbar-thumb-[#4f4f4f]"
                placeholder="Request body (JSON)"
                spellCheck={false}
              />
              <div className="absolute bottom-2 right-2 text-xs text-[#858585] bg-[#2d2d30] px-2 py-1 rounded">
                JSON
              </div>
            </div>
          </div>

          {/* Response */}
          <div className="flex-1 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#cccccc] uppercase tracking-wide">Response</h3>
              {response && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded font-mono ${
                    response.status >= 200 && response.status < 300 
                      ? 'bg-emerald-600 text-white' 
                      : response.status >= 400 
                      ? 'bg-red-600 text-white' 
                      : 'bg-amber-600 text-white'
                  }`}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-[#858585]">
                    {Math.round(response.responseTime)}ms
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded overflow-hidden relative">
              <div className="h-full overflow-auto p-3 scrollbar-thin scrollbar-track-[#2d2d30] scrollbar-thumb-[#424242] hover:scrollbar-thumb-[#4f4f4f]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex items-center gap-2 text-[#858585]">
                      <div className="animate-spin w-4 h-4 border-2 border-[#007acc] border-t-transparent rounded-full"></div>
                      <span className="text-xs">Sending request...</span>
                    </div>
                  </div>
                ) : response ? (
                  <pre className="text-xs text-[#d4d4d4] whitespace-pre-wrap font-mono leading-relaxed">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                ) : (
                  <div className="text-[#858585] text-center py-8">
                    <div className="text-2xl mb-2">🚀</div>
                    <p className="text-xs">Send a request to see the response</p>
                    <p className="text-xs mt-1 opacity-60">Results will appear here</p>
                  </div>
                )}
              </div>
              {response && (
                <div className="absolute bottom-2 right-2 text-xs text-[#858585] bg-[#2d2d30] px-2 py-1 rounded">
                  JSON
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};