'use client';

import React, { useState } from 'react';
import { InfrastructureEntity, LogEntry } from '../types/infrastructure';

interface EntityDetailsProps {
  entity: InfrastructureEntity | null;
  onClose: () => void;
  onSave?: (updatedEntity: InfrastructureEntity) => void;
}

export const EntityDetails: React.FC<EntityDetailsProps> = ({ entity, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'api'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntity, setEditedEntity] = useState<InfrastructureEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edited entity when entity changes
  React.useEffect(() => {
    if (entity) {
      setEditedEntity({ ...entity });
    }
  }, [entity]);

  if (!entity || !editedEntity) return null;

  const handleSave = async () => {
    if (!onSave || !editedEntity) return;
    
    setIsSaving(true);
    try {
      await onSave(editedEntity);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save entity:', error);
      // You could add error toast here
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedEntity({ ...entity });
    setIsEditing(false);
  };

  const updateEntityField = (field: keyof InfrastructureEntity, value: any) => {
    setEditedEntity(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updatePort = (index: number, field: string, value: any) => {
    setEditedEntity(prev => {
      if (!prev) return null;
      const newPorts = [...prev.ports];
      newPorts[index] = { ...newPorts[index], [field]: value };
      return { ...prev, ports: newPorts };
    });
  };

  const addPort = () => {
    setEditedEntity(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ports: [...prev.ports, { number: 80, protocol: 'tcp' as const, service: 'http', status: 'open' as const }]
      };
    });
  };

  const removePort = (index: number) => {
    setEditedEntity(prev => {
      if (!prev) return null;
      return { ...prev, ports: prev.ports.filter((_, i) => i !== index) };
    });
  };

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
            {/* Edit/Save Controls */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Entity Properties</h3>
              <div className="flex space-x-2">
                {onSave && !isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    ✏️ Edit
                  </button>
                ) : onSave && isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isSaving && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>}
                      <span>💾 Save</span>
                    </button>
                  </>
                ) : !onSave ? (
                  <div className="text-gray-400 text-sm">
                    Read-only view
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-md font-semibold text-white mb-3">Basic Info</h4>
                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Name:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedEntity.name}
                        onChange={(e) => updateEntityField('name', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-300">{entity.name}</span>
                    )}
                  </div>

                  {/* Type (read-only for now) */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Type:</label>
                    <span className="text-gray-300">{entity.type}</span>
                  </div>

                  {/* Hostname */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Hostname:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedEntity.hostname}
                        onChange={(e) => updateEntityField('hostname', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-300">{entity.hostname}</span>
                    )}
                  </div>

                  {/* IP Address */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">IP Address:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedEntity.ip}
                        onChange={(e) => updateEntityField('ip', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                        placeholder="192.168.1.1"
                      />
                    ) : (
                      <span className="text-gray-300">{entity.ip}</span>
                    )}
                  </div>

                  {/* Fidelity */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Fidelity:</label>
                    {isEditing ? (
                      <select
                        value={editedEntity.fidelity}
                        onChange={(e) => updateEntityField('fidelity', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="virtual">Virtual</option>
                        <option value="semi_real">Semi Real</option>
                        <option value="concrete">Concrete</option>
                      </select>
                    ) : (
                      <span className="text-gray-300">{entity.fidelity}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-semibold text-white">Ports</h4>
                  {isEditing && (
                    <button
                      onClick={addPort}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                    >
                      + Add Port
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {editedEntity.ports.map((port, idx) => (
                    <div key={idx} className={`${isEditing ? 'bg-gray-700 p-3 rounded' : ''}`}>
                      {isEditing ? (
                        <div className="grid grid-cols-4 gap-2 items-center">
                          <input
                            type="number"
                            value={port.number}
                            onChange={(e) => updatePort(idx, 'number', parseInt(e.target.value) || 80)}
                            className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:border-cyan-400 focus:outline-none"
                            placeholder="Port"
                          />
                          <select
                            value={port.protocol}
                            onChange={(e) => updatePort(idx, 'protocol', e.target.value)}
                            className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:border-cyan-400 focus:outline-none"
                          >
                            <option value="tcp">TCP</option>
                            <option value="udp">UDP</option>
                          </select>
                          <input
                            type="text"
                            value={port.service}
                            onChange={(e) => updatePort(idx, 'service', e.target.value)}
                            className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:border-cyan-400 focus:outline-none"
                            placeholder="Service"
                          />
                          <div className="flex space-x-1">
                            <select
                              value={port.status}
                              onChange={(e) => updatePort(idx, 'status', e.target.value)}
                              className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:border-cyan-400 focus:outline-none flex-1"
                            >
                              <option value="open">Open</option>
                              <option value="closed">Closed</option>
                              <option value="filtered">Filtered</option>
                            </select>
                            <button
                              onClick={() => removePort(idx)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-300 text-sm">
                          {port.number}/{port.protocol} - {port.service} ({port.status})
                        </div>
                      )}
                    </div>
                  ))}
                  {editedEntity.ports.length === 0 && (
                    <div className="text-gray-400 text-sm">No ports configured</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Metadata Section */}
            <div>
              <h4 className="text-md font-semibold text-white mb-3">Metadata</h4>
              {isEditing ? (
                <textarea
                  value={JSON.stringify(editedEntity.metadata, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateEntityField('metadata', parsed);
                    } catch (error) {
                      // Keep the text as is if it's not valid JSON yet
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none font-mono"
                  rows={8}
                  placeholder="Enter valid JSON metadata..."
                />
              ) : (
                Object.keys(entity.metadata).length > 0 ? (
                  <pre className="bg-gray-900 p-3 rounded text-gray-300 text-sm overflow-x-auto">
                    {JSON.stringify(entity.metadata, null, 2)}
                  </pre>
                ) : (
                  <div className="text-gray-400 text-sm">No metadata available</div>
                )
              )}
            </div>
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
