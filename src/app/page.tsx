'use client';

import React, { useState, useEffect } from 'react';
import { SimulationEngine } from '../core/simulation-engine';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { CompanyGrid } from '../components/CompanyGrid';
import { EntityDetails } from '../components/EntityDetails';
import { PromptInput } from '../components/PromptInput';
import { SimulationControls } from '../components/SimulationControls';
import { CompanyMemoryPanel } from '../components/CompanyMemoryPanel';
import { DeveloperConsole } from '../components/DeveloperConsole';
import { InfrastructureMap } from '../components/InfrastructureMap';
import { AddNodeModal } from '../components/AddNodeModal';
import { NodeEditorPanel } from '../components/NodeEditorPanel';
import { useGlobalChat } from '../components/GlobalChatProvider';
import { InfrastructureEntity, SimulationState, FidelityLevel, EntityType } from '../types/infrastructure';
import { useAppStore } from '../store/app-store';
import { useContextManager } from '../hooks/useContextManager';

export default function Home() {
  const { setShowSettings } = useAppStore();
  
  // Use global chat instead of local state
  const { chatMessages, setChatMessages } = useGlobalChat();
  
  // Context management
  const contextManager = useContextManager();
  const { currentContext } = useAppStore();

  // Core services
  const [engine] = useState(() => new SimulationEngine());
  const [vectorService] = useState(() => new ClientVectorMemoryService());

  // State management
  const [simulationState, setSimulationState] = useState<SimulationState>(() => engine.getState());
  const [selectedEntity, setSelectedEntity] = useState<InfrastructureEntity | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'prompt' | 'memory' | 'developer'>('prompt');
  const [vectorMemoryReady, setVectorMemoryReady] = useState(false);

  // Infrastructure view state
  const [currentOrganization, setCurrentOrganization] = useState<InfrastructureEntity | null>(null);
  const [internalEntities, setInternalEntities] = useState<InfrastructureEntity[]>([]);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<InfrastructureEntity | null>(null);

  useEffect(() => {
    const unsubscribe = engine.subscribe(setSimulationState);
    return unsubscribe;
  }, [engine]);

  useEffect(() => {
    const initializeVectorMemory = async () => {
      try {
        await vectorService.getAllCompaniesFromMemory();
        setVectorMemoryReady(true);
        console.log('✅ Vector memory service initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize vector memory service:', error);
      }
    };
    initializeVectorMemory();
  }, [vectorService]);

  // Context management effects
  useEffect(() => {
    const newState = {
      selectedEntity: selectedEntity?.id,
      activeTab,
      currentCompanyId: currentOrganization?.id,
      isInInfrastructureView: Object.keys(simulationState.entities).length > 0,
      isInCompanyView: !!currentOrganization,
      sidebarOpen
    };
    
    const currentMode = currentContext.mode;
    const detectedMode = contextManager.detectContextFromState(newState);
    
    if (currentMode !== detectedMode) {
      contextManager.updateContextFromState(newState);
    }
  }, [selectedEntity?.id, activeTab, currentOrganization?.id, Object.keys(simulationState.entities).length, sidebarOpen]);

  const handleEntitySelect = (entity: InfrastructureEntity) => {
    setSelectedEntity(entity);
    if (entity.type === EntityType.ORGANIZATION) {
      contextManager.switchToCompanyManagement(entity.id);
      setCurrentOrganization(entity);
      setInternalEntities(entity.metadata.internalEntities || []);
    } else {
      contextManager.switchToInfrastructureManagement(entity.id);
    }
  };

  const handleTabChange = (tab: 'prompt' | 'memory' | 'developer') => {
    setActiveTab(tab);

    switch (tab) {
      case 'developer':
        contextManager.switchToApiManagement();
        break;
      case 'memory':
        contextManager.switchToCompanyManagement();
        break;
      case 'prompt':
        if (Object.keys(simulationState.entities).length > 0) {
          contextManager.switchToInfrastructureManagement();
        } else {
          contextManager.switchToGeneralAssistance();
        }
        break;
    }
  };

  const handlePromptSubmit = async (prompt: string) => {
    setIsProcessing(true);
    try {
      // Clear existing entities first
      Object.keys(simulationState.entities).forEach(id => {
        engine.removeEntity(id);
      });
      
      // Use the vector memory service to create organization
      const rootOrg = await vectorService.createRootOrganizationWithMemory(prompt);
      const entityId = engine.addEntity(rootOrg);
      
      // Get the newly created entity and automatically expand it
      const newEntity = engine.getState().entities[entityId];
      if (newEntity && newEntity.type === EntityType.ORGANIZATION) {
        setCurrentOrganization(newEntity);
        const internalEntities = newEntity.metadata.internalEntities || [];
        internalEntities.forEach(internalEntity => {
          engine.addEntity(internalEntity);
        });
        setInternalEntities(internalEntities);
      }
    } catch (error) {
      console.error('Error processing prompt:', error);
    }
    setIsProcessing(false);
  };

  const handleEntityEdit = (entity: InfrastructureEntity) => {
    setEditingEntity(entity);
  };

  const handleEntityAdd = (parentEntity: InfrastructureEntity) => {
    setShowAddNodeModal(true);
  };

  const handleAddNode = (entity: InfrastructureEntity) => {
    engine.addEntity(entity);
    setShowAddNodeModal(false);
  };

  const handleEntityUpdate = (updatedEntity: InfrastructureEntity) => {
    engine.updateEntity(updatedEntity.id, updatedEntity);
    setEditingEntity(null);
  };

  const handleEntitySave = async (updatedEntity: InfrastructureEntity) => {
    try {
      engine.updateEntity(updatedEntity.id, updatedEntity);
      
      if (updatedEntity.type === EntityType.ORGANIZATION) {
        const companyRecord = {
          id: updatedEntity.id,
          name: updatedEntity.name,
          description: updatedEntity.metadata.description || `${updatedEntity.name} organization`,
          sectorTags: updatedEntity.metadata.sectorTags || [],
          services: updatedEntity.metadata.coreFunctions || [],
          metadata: {
            ...updatedEntity.metadata,
            hostname: updatedEntity.hostname,
            ip: updatedEntity.ip,
            fidelity: updatedEntity.fidelity,
            lastUpdated: new Date().toISOString()
          },
          infrastructure: updatedEntity.metadata.internalEntities || [],
          createdAt: updatedEntity.metadata.createdAt ? new Date(updatedEntity.metadata.createdAt) : new Date(),
          updatedAt: new Date()
        };
        await vectorService.updateCompanyInMemory(companyRecord);
      }
      
      // Add success message to global chat
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `✅ Entity "${updatedEntity.name}" updated successfully and synced to vector memory`,
        timestamp: new Date()
      }]);
      
      setSelectedEntity(null);
      
    } catch (error) {
      console.error('Failed to save entity:', error);
      
      // Add error message to global chat
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `❌ Failed to save entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }]);
      
      throw error;
    }
  };

  const handleExportInfrastructure = () => {
    try {
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          generator: 'InfraSim Infrastructure Editor'
        },
        topology: {
          entities: Object.values(simulationState.entities),
          connections: extractConnections()
        },
        simulation: {
          isRunning: simulationState.isRunning,
          clock: simulationState.clock,
          tickRate: simulationState.tickRate
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `infrastructure-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Add success message to global chat
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Infrastructure exported successfully! Downloaded as infrastructure-export-${Date.now()}.json`,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Export error:', error);
      // Add error message to global chat
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }]);
    }
  };

  const extractConnections = () => {
    const connections: Array<{ from: string; to: string }> = [];
    
    Object.values(simulationState.entities).forEach(entity => {
      entity.connections.forEach(targetId => {
        const targetEntity = simulationState.entities[targetId];
        if (targetEntity) {
          connections.push({
            from: entity.hostname || entity.id,
            to: targetEntity.hostname || entity.id
          });
        }
      });
    });
    
    return connections;
  };

  // Adjust main content to account for global chat panel
  const getMainContentClasses = () => {
    return "flex-1 relative pr-96"; // Always account for chat panel on right
  };

  return (
    <div className="h-screen flex bg-cyber-dark text-white relative">
      <div className={`${sidebarOpen ? 'w-96' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-900 border-r border-gray-700`}>
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <div></div>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                {currentContext.mode.replace('_', ' ')}
              </div>
              {Object.keys(simulationState.entities).length > 0 && (
                <>
                  <button
                    onClick={handleExportInfrastructure}
                    className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs flex items-center space-x-1 transition-colors"
                    title="Export Infrastructure"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => setShowAddNodeModal(true)}
                    className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs flex items-center space-x-1 transition-colors"
                    title="Add Infrastructure Node"
                  >
                    <span className="text-sm">➕</span>
                    <span>Add</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ←
              </button>
            </div>
          </div>

          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => handleTabChange('prompt')}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                activeTab === 'prompt' 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💬 Prompt
            </button>
            <button
              onClick={() => handleTabChange('memory')}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                activeTab === 'memory' 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🧠 Memory
            </button>
            <button
              onClick={() => handleTabChange('developer')}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                activeTab === 'developer' 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🛠️ Developer
            </button>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'prompt' && (
            <>
              <PromptInput onSubmit={handlePromptSubmit} isProcessing={isProcessing} />
              
              <SimulationControls
                state={simulationState}
                onStart={() => engine.start()}
                onStop={() => engine.stop()}
                onReset={() => {
                  engine.stop();
                  Object.keys(simulationState.entities).forEach(id => {
                    engine.removeEntity(id);
                  });
                  setCurrentOrganization(null);
                  setInternalEntities([]);
                }}
              />
              
              <div className="text-sm text-gray-400">
                <h3 className="font-semibold mb-2">Context: {currentContext.mode.replace('_', ' ')}</h3>
                <p className="text-xs mb-2">{contextManager.getContextInstructions()}</p>
                <ul className="space-y-1 text-xs">
                  <li>• Click any company card to explore its infrastructure</li>
                  <li>• Use the AI Assistant chat for guided help</li>
                  <li>• Context automatically adapts to your current work</li>
                  <li>• Switch modes manually in the chat panel</li>
                  <li>• View agent activity in real-time</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'memory' && (
            <>
              {vectorMemoryReady ? (
                <CompanyMemoryPanel
                  vectorService={vectorService}
                  onCompanySelect={async (company) => {
                    setIsProcessing(true);
                    try {
                      Object.keys(simulationState.entities).forEach(id => {
                        engine.removeEntity(id);
                      });
                      
                      const description = `${company.name}: ${company.description}. Services: ${company.services.join(', ')}. Sector: ${company.sectorTags.join(', ')}.`;
                      const fullOrganization = await vectorService.createRootOrganizationWithMemory(description);
                      
                      const orgEntity: InfrastructureEntity = {
                        id: fullOrganization.id || company.id,
                        type: EntityType.ORGANIZATION,
                        name: fullOrganization.name || company.name,
                        hostname: fullOrganization.hostname || `${company.name.toLowerCase().replace(/\s+/g, '')}.local`,
                        ip: fullOrganization.ip || '192.168.1.1',
                        fidelity: fullOrganization.fidelity || FidelityLevel.VIRTUAL,
                        ports: fullOrganization.ports || [],
                        metadata: {
                          ...fullOrganization.metadata,
                          description: company.description,
                          coreFunctions: company.services,
                          sectorTags: company.sectorTags,
                          internalEntities: fullOrganization.metadata?.internalEntities || [],
                          memorySource: true
                        },
                        position: fullOrganization.position || { x: 400, y: 300 },
                        connections: fullOrganization.connections || [],
                        logs: fullOrganization.logs || [],
                        apiSpec: fullOrganization.apiSpec
                      };
                      
                      const entityId = engine.addEntity(orgEntity);
                      const internalEntities = orgEntity.metadata.internalEntities || [];
                      internalEntities.forEach(internalEntity => {
                        engine.addEntity(internalEntity);
                      });
                      
                      // Update context for company management
                      contextManager.switchToCompanyManagement(orgEntity.id);
                      setCurrentOrganization(orgEntity);
                      setInternalEntities(internalEntities);
                      
                    } catch (error) {
                      console.error('Error creating organization from memory:', error);
                    }
                    setIsProcessing(false);
                  }}
                  company={null}
                  onUpdateDescription={async () => {}}
                  onClose={() => {}}
                />
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Initializing vector memory...
                </div>
              )}
              
              <div className="text-sm text-gray-400">
                <h3 className="font-semibold mb-2">Company Management Mode</h3>
                <ul className="space-y-1 text-xs">
                  <li>• Add companies with descriptions and tags</li>
                  <li>• Search using natural language queries</li>
                  <li>• Find similar companies automatically</li>
                  <li>• Click companies to create organizations</li>
                  <li>• Context switches to company management</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'developer' && (
            <div className="text-sm text-gray-400">
              <h3 className="font-semibold mb-2 text-cyan-400">API Management Mode</h3>
              <p className="mb-4 text-xs">
                Test and debug vector memory API endpoints with a built-in HTTP client.
              </p>
              <div className="text-sm text-gray-400">
                <h4 className="font-semibold mb-2">Features:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Pre-configured API request templates</li>
                  <li>• Context-aware API operations</li>
                  <li>• Real-time response inspection</li>
                  <li>• Save and organize custom requests</li>
                  <li>• Test company CRUD operations</li>
                  <li>• Infrastructure parsing workflows</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-10 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded"
        >
          →
        </button>
      )}

      <div className={getMainContentClasses()}>
        {activeTab === 'developer' ? (
          <DeveloperConsole />
        ) : Object.keys(simulationState.entities).length > 0 ? (
          <InfrastructureMap
            entities={simulationState.entities}
            onEntityClick={handleEntitySelect}
            onEntityEdit={handleEntityEdit}
            onEntityAdd={handleEntityAdd}
            onEntityFidelityChange={(id, fidelity) => engine.updateEntityFidelity(id, fidelity)}
            onEntityUpdate={handleEntityUpdate}
            onEntityDelete={(id) => engine.removeEntity(id)}
          />
        ) : (
          <CompanyGrid onCompanyClick={(entity) => {
            const entityId = engine.addEntity(entity);
            console.log(`Added company entity to simulation: ${entity.name} (${entityId})`);
            contextManager.switchToCompanyManagement(entity.id);
            setCurrentOrganization(entity);
            const internalEntities = entity.metadata.internalEntities || [];
            internalEntities.forEach(internalEntity => {
              engine.addEntity(internalEntity);
            });
            setInternalEntities(internalEntities);
          }} />
        )}
      </div>

      <EntityDetails
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onSave={handleEntitySave}
      />
      {showAddNodeModal && (
        <AddNodeModal
          isOpen={showAddNodeModal}
          onClose={() => setShowAddNodeModal(false)}
          onAdd={handleAddNode}
          existingEntities={simulationState.entities}
        />
      )}
      {editingEntity && (
        <NodeEditorPanel
          entity={editingEntity}
          onClose={() => setEditingEntity(null)}
          onSave={handleEntityUpdate}
          onDelete={(id) => {
            engine.removeEntity(id);
            setEditingEntity(null);
          }}
        />
      )}
    </div>
  );
}
