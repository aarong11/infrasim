'use client';

import React, { useState } from 'react';
import { InfrastructureEntity, LogEntry } from '../types/infrastructure';

interface EntityDetailsProps {
  entity: InfrastructureEntity | null;
  onClose: () => void;
}

export const EntityDetails: React.FC<EntityDetailsProps> = ({ entity, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'api'>('overview');

  if (!entity) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{entity.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex space-x-4 mb-4">
          {(['overview', 'logs', 'api'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded ${
                activeTab === tab
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Basic Info</h3>
                <div className="space-y-1 text-gray-300">
                  <p><span className="text-gray-400">Type:</span> {entity.type}</p>
                  <p><span className="text-gray-400">Hostname:</span> {entity.hostname}</p>
                  <p><span className="text-gray-400">IP:</span> {entity.ip}</p>
                  <p><span className="text-gray-400">Fidelity:</span> {entity.fidelity}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Ports</h3>
                <div className="space-y-1">
                  {entity.ports.map((port, idx) => (
                    <div key={idx} className="text-gray-300 text-sm">
                      {port.number}/{port.protocol} - {port.service} ({port.status})
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {Object.keys(entity.metadata).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Metadata</h3>
                <pre className="bg-gray-900 p-3 rounded text-gray-300 text-sm overflow-x-auto">
                  {JSON.stringify(entity.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Recent Logs</h3>
            <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
              {entity.logs.length === 0 ? (
                <p className="text-gray-400">No logs available</p>
              ) : (
                entity.logs.map((log, idx) => (
                  <div key={idx} className="mb-2 text-sm">
                    <span className="text-gray-400">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      log.level === 'error' ? 'bg-red-900 text-red-200' :
                      log.level === 'warn' ? 'bg-yellow-900 text-yellow-200' :
                      'bg-blue-900 text-blue-200'
                    }`}>
                      {log.level}
                    </span>
                    <span className="ml-2 text-gray-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">API Specification</h3>
              {entity.apiSpec ? (
                <pre className="bg-gray-900 p-4 rounded text-gray-300 text-sm overflow-x-auto max-h-96">
                  {JSON.stringify(entity.apiSpec, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-400">No API specification available for this entity</p>
              )}
            </div>

            {/* OpenAPI Stub Section */}
            {entity.metadata.openAPIStub && Object.keys(entity.metadata.openAPIStub).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Generated API Endpoints</h3>
                <div className="space-y-3">
                  {Object.entries(entity.metadata.openAPIStub).map(([endpoint, spec]) => (
                    <div key={endpoint} className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded text-xs font-bold ${
                          spec.method === 'GET' ? 'bg-green-600 text-white' :
                          spec.method === 'POST' ? 'bg-blue-600 text-white' :
                          spec.method === 'PUT' ? 'bg-yellow-600 text-white' :
                          spec.method === 'DELETE' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {spec.method}
                        </span>
                        <span className="text-cyan-400 font-mono">{endpoint}</span>
                        {spec.compliance && (
                          <span className="text-xs px-2 py-1 bg-orange-600 text-white rounded">
                            {spec.compliance.join(', ')}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-2">Request</h4>
                          <div className="bg-gray-800 p-3 rounded">
                            {Object.keys(spec.request).length === 0 ? (
                              <span className="text-gray-500 text-sm">No parameters</span>
                            ) : (
                              <div className="space-y-1">
                                {Object.entries(spec.request).map(([key, type]) => (
                                  <div key={key} className="text-sm">
                                    <span className="text-blue-300">{key}</span>
                                    <span className="text-gray-400">: </span>
                                    <span className="text-green-300">{type}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-2">Response</h4>
                          <div className="bg-gray-800 p-3 rounded">
                            <div className="space-y-1">
                              {Object.entries(spec.response).map(([key, type]) => (
                                <div key={key} className="text-sm">
                                  <span className="text-blue-300">{key}</span>
                                  <span className="text-gray-400">: </span>
                                  <span className="text-green-300">{type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
