'use client';

import React, { useState, useEffect } from 'react';
import { InfrastructureEntity, FidelityLevel, LogEntry, EntityType } from '../types/infrastructure';
import { MiniInfrastructureGraph } from './MiniInfrastructureGraph';
import { generateOpenAPIStub } from '../utils/openApiStubGenerator';
import { StructuredToolParser } from '../tools/parser';
import { ToolHandlers } from '../tools/handlers';
import { ToolAction } from '../tools/schema';
import { v4 as uuidv4 } from 'uuid';

interface ZoomModalProps {
  entity: InfrastructureEntity | null;
  onClose: () => void;
  isExpanding?: boolean;
}

export const ZoomModal: React.FC<ZoomModalProps> = ({ entity, onClose, isExpanding = false }) => {
  const [activeTab, setActiveTab] = useState<'graph' | 'details' | 'logs' | 'api'>('graph');
  const [internalEntities, setInternalEntities] = useState<InfrastructureEntity[]>([]);
  const [selectedInternalEntity, setSelectedInternalEntity] = useState<InfrastructureEntity | null>(null);
  const [isGeneratingInfrastructure, setIsGeneratingInfrastructure] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Chat state for modal
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: string;
    content: string;
    timestamp: Date;
    data?: any; // Optional data property
  }>>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome! Use natural language to add or modify this organization\'s internal infrastructure. Try: "Add a database server", "Connect the web app to the database"',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolParser] = useState(() => new StructuredToolParser());
  const [toolHandlers] = useState(() => new ToolHandlers());

  useEffect(() => {
    if (entity?.metadata.internalEntities) {
      setInternalEntities(entity.metadata.internalEntities);
    }
    
    // Try to extract company ID from entity metadata
    if (entity?.metadata.companyId) {
      setCompanyId(entity.metadata.companyId);
    } else if (entity?.id) {
      // Use entity ID as fallback company ID
      setCompanyId(entity.id);
    }
  }, [entity]);

  // Auto-generate infrastructure if none exists
  useEffect(() => {
    if (entity && entity.type === EntityType.ORGANIZATION && 
        (!entity.metadata.internalEntities || entity.metadata.internalEntities.length === 0) && 
        !isGeneratingInfrastructure) {
      generateInitialInfrastructure();
    }
  }, [entity, isGeneratingInfrastructure]);

  if (!entity) return null;

  // Generate initial infrastructure
  const generateInitialInfrastructure = async () => {
    if (!entity || entity.type !== EntityType.ORGANIZATION) return;
    
    setIsGeneratingInfrastructure(true);
    
    try {
      // Generate infrastructure description based on entity metadata
      const description = `Generate detailed internal infrastructure for ${entity.name}. 
        Core functions: ${entity.metadata.coreFunctions?.join(', ') || 'General business operations'}
        Description: ${entity.metadata.description || 'Technology organization'}
        
        Create specific components like web applications, databases, API services, load balancers, etc.`;

      // Use the API to parse infrastructure description
      const response = await fetch('/api/vector-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parseInfrastructure', description })
      });

      if (!response.ok) {
        throw new Error('Failed to generate infrastructure');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Infrastructure generation failed');
      }

      const parsed = data.parsed;
      
      // Convert parsed entities to internal entities
      const newInternalEntities: InfrastructureEntity[] = parsed.entities.map((entityData: any, index: number) => {
        const newEntity: InfrastructureEntity = {
          id: uuidv4(),
          type: entityData.type || EntityType.WEB_APP,
          name: entityData.name || `Component ${index + 1}`,
          hostname: entityData.hostname || `comp${index + 1}.${entity.name.toLowerCase().replace(/\s+/g, '')}.local`,
          ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          fidelity: FidelityLevel.VIRTUAL,
          ports: entityData.ports || [],
          metadata: entityData.metadata || {},
          position: { 
            x: 200 + Math.random() * 400, 
            y: 200 + Math.random() * 300 
          },
          connections: [],
          logs: []
        };
        
        return newEntity;
      });

      // Add connections between internal entities
      parsed.connections.forEach((conn: any) => {
        const fromEntity = newInternalEntities.find(e => 
          e.hostname === conn.from || e.name === conn.from
        );
        const toEntity = newInternalEntities.find(e => 
          e.hostname === conn.to || e.name === conn.to
        );
        
        if (fromEntity && toEntity) {
          fromEntity.connections.push(toEntity.id);
        }
      });

      // Update the entity with internal entities
      if (entity.metadata) {
        entity.metadata.internalEntities = newInternalEntities;
      }
      
      setInternalEntities(newInternalEntities);
      
      // Add success message to chat
      const successMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `✅ Generated ${newInternalEntities.length} infrastructure components for ${entity.name}`,
        timestamp: new Date(),
        data: { generatedEntities: newInternalEntities.length }
      };
      setChatMessages(prev => [...prev, successMessage]);

    } catch (error) {
      console.error('Failed to generate infrastructure:', error);
      
      // Fallback to default internal entities
      const fallbackEntities = generateFallbackInternalEntities(entity);
      entity.metadata.internalEntities = fallbackEntities;
      setInternalEntities(fallbackEntities);
      
      // Add fallback message to chat
      const fallbackMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `⚠️ Used fallback infrastructure generation. Created ${fallbackEntities.length} basic components.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, fallbackMessage]);
    }
    
    setIsGeneratingInfrastructure(false);
  };

  // Generate fallback internal entities
  const generateFallbackInternalEntities = (parentEntity: InfrastructureEntity): InfrastructureEntity[] => {
    const baseName = parentEntity.name.toLowerCase().replace(/\s+/g, '');
    
    return [
      {
        id: uuidv4(),
        type: EntityType.WEB_APP,
        name: `${parentEntity.name} Web Portal`,
        hostname: `web.${baseName}.local`,
        ip: '10.0.1.10',
        fidelity: FidelityLevel.VIRTUAL,
        ports: [
          { number: 80, protocol: 'tcp', service: 'http', status: 'open' },
          { number: 443, protocol: 'tcp', service: 'https', status: 'open' }
        ],
        metadata: { description: 'Main web application' },
        position: { x: 200, y: 150 },
        connections: [],
        logs: []
      },
      {
        id: uuidv4(),
        type: EntityType.DATABASE,
        name: `${parentEntity.name} Database`,
        hostname: `db.${baseName}.local`,
        ip: '10.0.1.20',
        fidelity: FidelityLevel.VIRTUAL,
        ports: [
          { number: 5432, protocol: 'tcp', service: 'postgresql', status: 'open' }
        ],
        metadata: { description: 'Primary database' },
        position: { x: 400, y: 250 },
        connections: [],
        logs: []
      },
      {
        id: uuidv4(),
        type: EntityType.API_SERVICE,
        name: `${parentEntity.name} API`,
        hostname: `api.${baseName}.local`,
        ip: '10.0.1.30',
        fidelity: FidelityLevel.VIRTUAL,
        ports: [
          { number: 8080, protocol: 'tcp', service: 'http-api', status: 'open' }
        ],
        metadata: { 
          description: 'REST API service',
          endpoints: ['/users', '/auth', '/data'],
          coreFunctions: ['Authentication', 'Data access']
        },
        position: { x: 300, y: 350 },
        connections: [],
        logs: []
      }
    ];
  };

  const handleInternalEntityClick = (internalEntity: InfrastructureEntity) => {
    setSelectedInternalEntity(internalEntity);
    setActiveTab('details');
  };

  const handleInternalEntityFidelityChange = (id: string, fidelity: FidelityLevel) => {
    setInternalEntities(prev => 
      prev.map(e => e.id === id ? { ...e, fidelity } : e)
    );
    
    // Update the main entity's internal entities as well
    if (entity.metadata.internalEntities) {
      entity.metadata.internalEntities = entity.metadata.internalEntities.map(e => 
        e.id === id ? { ...e, fidelity } : e
      );
    }
  };

  const handleRemoveEntity = (entityId: string) => {
    setInternalEntities(prev => {
      const updated = prev.filter(e => e.id !== entityId);
      
      // Remove connections to this entity
      updated.forEach(entity => {
        entity.connections = entity.connections.filter(connId => connId !== entityId);
      });
      
      return updated;
    });
    
    // Update the main entity's internal entities as well
    if (entity.metadata.internalEntities) {
      entity.metadata.internalEntities = entity.metadata.internalEntities.filter(e => e.id !== entityId);
    }
    
    // Clear selection if the removed entity was selected
    if (selectedInternalEntity?.id === entityId) {
      setSelectedInternalEntity(null);
    }
    
    // Add message to chat
    const message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `🗑️ Removed entity from infrastructure`,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, message]);
  };

  const handleInternalEntityEdit = (internalEntity: InfrastructureEntity) => {
    setSelectedInternalEntity(internalEntity);
    setActiveTab('details');
  };

  const handleInternalEntityAdd = (parentEntity: InfrastructureEntity) => {
    // When adding to an internal entity, we could show a modal or use the chat
    // For now, let's guide the user to use the chat
    const message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `💡 To add components to ${parentEntity.name}, try using the chat! For example: "Add a database to connect to ${parentEntity.name}"`,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, message]);
  };

  const handleInternalEntityDelete = (entityId: string) => {
    handleRemoveEntity(entityId);
  };

  const generateSyntheticLogs = (entity: InfrastructureEntity): LogEntry[] => {
    const baseMessages = [
      'System startup completed',
      'Connection established with external service',
      'Authentication successful',
      'Data synchronization in progress',
      'Cache refresh completed',
      'Security scan passed',
      'Backup process initiated',
      'Performance metrics collected',
      'API request processed',
      'Database connection pooled'
    ];

    return Array.from({ length: 20 }, (_, i) => {
      const randomLevel = Math.random();
      let level: 'info' | 'warn' | 'error' | 'debug';
      
      if (randomLevel > 0.95) level = 'error';
      else if (randomLevel > 0.9) level = 'warn';
      else if (randomLevel > 0.8) level = 'debug';
      else level = 'info';

      return {
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
        level,
        message: baseMessages[Math.floor(Math.random() * baseMessages.length)],
        source: entity.name
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  // Chat submit handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isProcessing) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsProcessing(true);

    try {
      const parseResult = await toolParser.parseInput(chatInput.trim());
      
      if (parseResult.success) {
        // Inject company ID context for infrastructure operations
        if (parseResult.action.action === 'modifyInfrastructure' && companyId) {
          parseResult.action.parameters.companyId = companyId;
        }

        // Inject context for chat actions
        if (parseResult.action.action === 'chat') {
          parseResult.action.parameters.context = {
            companyId: companyId || undefined,
            companyName: entity?.name,
            currentInfrastructure: internalEntities.map(e => e.name),
            topic: 'infrastructure'
          };
        }

        const executionResult = await toolHandlers.executeAction(parseResult.action);
        
        if (executionResult.success) {
          // Handle different action types and update local state
          if (parseResult.action.action === 'modifyInfrastructure') {
            const { operation, entity: entityParam, entityId } = parseResult.action.parameters;
            
            switch (operation) {
              case 'add':
                if (executionResult.data?.entity) {
                  setInternalEntities(prev => [...prev, executionResult.data.entity]);
                  // Update main entity's internal entities
                  if (entity.metadata) {
                    entity.metadata.internalEntities = [...(entity.metadata.internalEntities || []), executionResult.data.entity];
                  }
                }
                break;
                
              case 'remove':
                if (entityId) {
                  setInternalEntities(prev => {
                    const updated = prev.filter(e => e.id !== entityId);
                    // Update main entity's internal entities
                    if (entity.metadata) {
                      entity.metadata.internalEntities = entity.metadata.internalEntities?.filter(e => e.id !== entityId) || [];
                    }
                    return updated;
                  });
                }
                break;
                
              case 'update':
                if (executionResult.data?.entity) {
                  setInternalEntities(prev => prev.map(e => 
                    e.id === executionResult.data.entity.id ? executionResult.data.entity : e
                  ));
                  // Update main entity's internal entities
                  if (entity.metadata?.internalEntities) {
                    entity.metadata.internalEntities = entity.metadata.internalEntities.map(e => 
                      e.id === executionResult.data.entity.id ? executionResult.data.entity : e
                    );
                  }
                }
                break;
            }
          }
          
          // Legacy handlers for other action types
          if (parseResult.action.action === 'expandInfrastructure' && executionResult.data?.entity) {
            setInternalEntities(prev => [...prev, executionResult.data.entity]);
          }
          
          if (parseResult.action.action === 'linkEntities' && executionResult.data?.connection) {
            setInternalEntities(prev => prev.map(e => {
              if (e.id === executionResult.data.connection.sourceEntityId && !e.connections.includes(executionResult.data.connection.targetEntityId)) {
                return { ...e, connections: [...e.connections, executionResult.data.connection.targetEntityId] };
              }
              if (executionResult.data.connection.bidirectional && e.id === executionResult.data.connection.targetEntityId && !e.connections.includes(executionResult.data.connection.sourceEntityId)) {
                return { ...e, connections: [...e.connections, executionResult.data.connection.sourceEntityId] };
              }
              return e;
            }));
          }

          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: executionResult.message,
            timestamp: new Date(),
            data: executionResult.data
          };
          setChatMessages(prev => [...prev, assistantMessage]);
        } else {
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `Error: ${executionResult.error || executionResult.message}`,
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Handle fallback parsing - now more graceful with chat support
        if ('fallback' in parseResult && parseResult.fallback) {
          // Try to execute fallback
          try {
            // Inject context for fallback actions
            if (parseResult.fallback.action === 'modifyInfrastructure' && companyId) {
              parseResult.fallback.parameters = parseResult.fallback.parameters || {};
              parseResult.fallback.parameters.companyId = companyId;
            }

            if (parseResult.fallback.action === 'chat') {
              parseResult.fallback.parameters = parseResult.fallback.parameters || {};
              parseResult.fallback.parameters.context = {
                companyId: companyId || undefined,
                companyName: entity?.name,
                currentInfrastructure: internalEntities.map(e => e.name),
                topic: 'infrastructure'
              };
            }

            const fallbackResult = await toolHandlers.executeAction(parseResult.fallback as any);
            
            if (fallbackResult.success) {
              // Update state if entity was added
              if (parseResult.fallback.action === 'modifyInfrastructure' && fallbackResult.data?.entity) {
                setInternalEntities(prev => [...prev, fallbackResult.data.entity]);
              }

              const assistantMessage = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: fallbackResult.message,
                timestamp: new Date(),
                data: fallbackResult.data
              };
              setChatMessages(prev => [...prev, assistantMessage]);
            } else {
              throw new Error(fallbackResult.error || 'Fallback execution failed');
            }
          } catch (fallbackError) {
            console.error('Fallback execution failed:', fallbackError);
            
            // Final fallback - just chat about the error
            const errorMessage = {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: `I'm having trouble processing that request. Could you try rephrasing it or asking for help? For example, you could say "help me add a database" or "what can you do?"`,
              timestamp: new Date()
            };
            setChatMessages(prev => [...prev, errorMessage]);
          }
        } else {
          // No fallback available
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `I couldn't understand that request. Try asking me to add infrastructure components, or just say "help" to see what I can do!`,
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error. Feel free to try again or ask for help!`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-row border border-gray-700 animate-in zoom-in-95 duration-300">
        {/* Main content (graph, tabs, etc) */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🏢</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{entity.name}</h1>
                <p className="text-gray-400 text-sm">
                  {entity.metadata.description || 'Infrastructure Organization'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
            >
              ×
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 p-4 border-b border-gray-700">
            {(['graph', 'details', 'logs', 'api'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tab === 'graph' && '🔗 Infrastructure'}
                {tab === 'details' && '📋 Details'}
                {tab === 'logs' && '📄 Logs'}
                {tab === 'api' && '🔌 APIs'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-hidden">
            {isExpanding && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400">Generating internal infrastructure...</p>
                </div>
              </div>
            )}

            {!isExpanding && activeTab === 'graph' && (
              <div className="h-full">
                {internalEntities.length > 0 ? (
                  <MiniInfrastructureGraph
                    entities={internalEntities}
                    onEntityClick={handleInternalEntityClick}
                    onEntityFidelityChange={handleInternalEntityFidelityChange}
                    onEntityEdit={handleInternalEntityEdit}
                    onEntityAdd={handleInternalEntityAdd}
                    onEntityDelete={handleInternalEntityDelete}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <div className="text-6xl mb-4">🏗️</div>
                      <p>No internal infrastructure generated yet</p>
                      <button
                        onClick={generateInitialInfrastructure}
                        className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                      >
                        Generate Infrastructure
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="h-full overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Organization Info</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Name:</span> <span className="text-white">{entity.name}</span></div>
                      <div><span className="text-gray-400">Type:</span> <span className="text-white">{entity.type}</span></div>
                      <div><span className="text-gray-400">Fidelity:</span> <span className="text-white">{entity.fidelity}</span></div>
                      <div><span className="text-gray-400">Components:</span> <span className="text-white">{internalEntities.length}</span></div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Core Functions</h3>
                    <div className="space-y-1">
                      {entity.metadata.coreFunctions?.map((func, idx) => (
                        <div key={idx} className="text-sm bg-gray-700 px-3 py-1 rounded text-gray-200">
                          {func}
                        </div>
                      )) || <div className="text-gray-400 text-sm">No core functions defined</div>}
                    </div>
                  </div>
                </div>

                {selectedInternalEntity && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Selected Component: {selectedInternalEntity.name}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Technical Details</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-400">Type:</span> <span className="text-white">{selectedInternalEntity.type}</span></div>
                          <div><span className="text-gray-400">Hostname:</span> <span className="text-white">{selectedInternalEntity.hostname}</span></div>
                          <div><span className="text-gray-400">IP:</span> <span className="text-white">{selectedInternalEntity.ip}</span></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Ports</h4>
                        <div className="space-y-1">
                          {selectedInternalEntity.ports.map((port, idx) => (
                            <div key={idx} className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-200">
                              {port.number}/{port.protocol} - {port.service}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="h-full">
                <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-3">System Logs</h3>
                  <div className="flex-1 bg-gray-900 rounded p-3 overflow-y-auto font-mono text-sm">
                    {generateSyntheticLogs(entity).map((log, idx) => (
                      <div key={idx} className="mb-1 flex space-x-2">
                        <span className="text-gray-500 w-20 flex-shrink-0">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className={`w-12 flex-shrink-0 ${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                          'text-cyan-400'
                        }`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-gray-300">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="h-full overflow-y-auto space-y-4">
                <h3 className="text-lg font-semibold text-white">API Endpoints</h3>
                {internalEntities
                  .filter(e => e.metadata.openAPIStub || e.metadata.endpoints)
                  .map(entity => {
                    const stub = generateOpenAPIStub(entity);
                    return (
                      <div key={entity.id} className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-white mb-3">{entity.name}</h4>
                        {Object.keys(stub).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(stub).map(([endpoint, spec]) => (
                              <div key={endpoint} className="bg-gray-900 rounded p-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    spec.method === 'GET' ? 'bg-green-600' :
                                    spec.method === 'POST' ? 'bg-blue-600' :
                                    spec.method === 'PUT' ? 'bg-yellow-600' :
                                    'bg-red-600'
                                  } text-white`}>
                                    {spec.method}
                                  </span>
                                  <span className="text-cyan-400 font-mono">{endpoint}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <div className="text-gray-400 mb-1">Request:</div>
                                    <div className="bg-gray-800 p-2 rounded">
                                      {Object.keys(spec.request).length === 0 ? (
                                        <span className="text-gray-500">No parameters</span>
                                      ) : (
                                        Object.entries(spec.request).map(([key, type]) => (
                                          <div key={key}>
                                            <span className="text-blue-300">{key}</span>: <span className="text-green-300">{type}</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 mb-1">Response:</div>
                                    <div className="bg-gray-800 p-2 rounded">
                                      {Object.entries(spec.response).map(([key, type]) => (
                                        <div key={key}>
                                          <span className="text-blue-300">{key}</span>: <span className="text-green-300">{type}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">No API endpoints available</div>
                        )}
                      </div>
                    );
                  })}
                {internalEntities.filter(e => e.metadata.openAPIStub || e.metadata.endpoints).length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <div className="text-4xl mb-2">🔌</div>
                    <p>No API services found in this organization</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Chat Panel */}
        <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col">
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
            <h3 className="font-semibold text-cyan-400">AI Assistant</h3>
            <p className="text-xs text-gray-400">Model internal infra with chat</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.type === 'user'
                      ? 'bg-cyan-600 text-white'
                      : message.type === 'system'
                      ? 'bg-gray-700 text-gray-300 border border-gray-600'
                      : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.data && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-gray-400">View data</summary>
                      <pre className="mt-1 text-gray-400 overflow-x-auto">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
                    <span>Processing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-gray-700 p-4">
            <form onSubmit={handleChatSubmit} className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Describe what you want to do..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={isProcessing || !chatInput.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:text-gray-400 px-4 py-2 rounded text-sm transition-colors"
              >
                Send
              </button>
            </form>
            <div className="mt-2 text-xs text-gray-400">
              <p>Try: "Add a web app", "Connect web to db"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};