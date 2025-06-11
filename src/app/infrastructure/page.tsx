'use client';

import React, { useState, useEffect } from 'react';
import { SimulationEngine } from '../../core/simulation-engine';
import { ClientVectorMemoryService } from '../../core/client-vector-memory-service';
import { InfrastructureMap } from '../../components/InfrastructureMap';
import { EntityDetails } from '../../components/EntityDetails';
import { StructuredToolParser } from '../../tools/parser';
import { ToolHandlers } from '../../tools/handlers';
import { InfrastructureEntity, SimulationState, FidelityLevel, EntityType } from '../../types/infrastructure';
import { ToolAction } from '../../tools/schema';
import { AddNodeModal } from '../../components/AddNodeModal';
import { NodeEditorPanel } from '../../components/NodeEditorPanel';
import { useAppStore } from '../../store/app-store';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any;
}

export default function InfrastructurePage() {
  const { setShowSettings } = useAppStore();

  // Core services
  const [engine] = useState(() => new SimulationEngine());
  const [vectorService] = useState(() => new ClientVectorMemoryService());
  const [toolParser] = useState(() => new StructuredToolParser());
  const [toolHandlers] = useState(() => new ToolHandlers());
  
  // State management
  const [simulationState, setSimulationState] = useState<SimulationState>(() => engine.getState());
  const [selectedEntity, setSelectedEntity] = useState<InfrastructureEntity | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to the Infrastructure Editor! I can help you create, modify, and export infrastructure models using natural language. Try saying things like:\n\n• "Create a web company called TechCorp"\n• "Add a load balancer to the infrastructure"\n• "Connect the web server to the database"\n• "Generate API specs for the payment service"',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<InfrastructureEntity | null>(null);

  // Initialize services
  useEffect(() => {
    const unsubscribe = engine.subscribe(setSimulationState);
    
    const initializeServices = async () => {
      try {
        await toolHandlers.initialize();
        await vectorService.getAllCompaniesFromMemory();
        console.log('✅ Infrastructure services initialized');
      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
      }
    };

    initializeServices();
    return unsubscribe;
  }, [engine, toolHandlers, vectorService]);

  // Handle chat message submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsProcessing(true);

    try {
      // Parse user input using structured tool parser
      const parseResult = await toolParser.parseInput(chatInput.trim());
      
      if (parseResult.success) {
        // Execute the parsed action using tool handlers
        const executionResult = await toolHandlers.executeAction(parseResult.action);
        
        if (executionResult.success) {
          // Update infrastructure state based on action type
          await updateInfrastructureFromAction(parseResult.action, executionResult);
          
          // Add success message
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: executionResult.message,
            timestamp: new Date(),
            data: executionResult.data
          };
          setChatMessages(prev => [...prev, assistantMessage]);
        } else {
          // Add error message
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `Error: ${executionResult.error || executionResult.message}`,
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Parsing failed, try fallback or show error
        let fallbackMessage: string;
        if ('fallback' in parseResult && parseResult.fallback) {
          fallbackMessage = `I couldn't fully understand that, but I'll try: ${JSON.stringify(parseResult.fallback, null, 2)}`;
        } else {
          fallbackMessage = `I couldn't understand "${chatInput.trim()}". Try commands like "create a company called X" or "add a database server".`;
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fallbackMessage,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat processing error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update infrastructure based on tool action results
  const updateInfrastructureFromAction = async (action: ToolAction, result: any) => {
    switch (action.action) {
      case 'createCompany':
        if (result.data?.organization) {
          // Add the new organization to simulation engine
          const entityId = engine.addEntity(result.data.organization);
          console.log(`Added company entity: ${entityId}`);
        }
        break;
        
      case 'expandInfrastructure':
        if (result.data?.entity) {
          // Add the new infrastructure entity
          const entityId = engine.addEntity(result.data.entity);
          console.log(`Added infrastructure entity: ${entityId}`);
        }
        break;
        
      case 'linkEntities':
        if (result.data?.connection) {
          // Update entity connections in the simulation
          const { sourceEntityId, targetEntityId } = result.data.connection;
          const sourceEntity = simulationState.entities[sourceEntityId];
          const targetEntity = simulationState.entities[targetEntityId];
          
          if (sourceEntity && targetEntity) {
            if (!sourceEntity.connections.includes(targetEntityId)) {
              sourceEntity.connections.push(targetEntityId);
            }
            if (result.data.connection.bidirectional && !targetEntity.connections.includes(sourceEntityId)) {
              targetEntity.connections.push(sourceEntityId);
            }
          }
        }
        break;
        
      case 'generateApi':
        // API generation handled by the tool, no additional state update needed
        break;
        
      case 'controlSimulation':
        // Simulation control handled by the tool
        break;
    }
    
    // Trigger vector memory sync if needed
    await syncToVectorMemory(action, result);
  };

  // Sync changes to vector memory
  const syncToVectorMemory = async (action: ToolAction, result: any) => {
    try {
      if (action.action === 'createCompany' && result.data?.company) {
        // Add company to vector memory
        await vectorService.addCompanyToMemory(result.data.company);
      }
      // Add other sync operations as needed
    } catch (error) {
      console.error('Vector memory sync error:', error);
    }
  };

  // Export infrastructure as JSON
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

      // Optionally validate against a Zod schema here if imported
      // Create and download file
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

      // Add success message to chat
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Infrastructure exported successfully! Downloaded as infrastructure-export-${Date.now()}.json`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  // Extract connections from entities
  const extractConnections = () => {
    const connections: Array<{ from: string; to: string }> = [];
    
    Object.values(simulationState.entities).forEach(entity => {
      entity.connections.forEach(targetId => {
        const targetEntity = simulationState.entities[targetId];
        if (targetEntity) {
          connections.push({
            from: entity.hostname || entity.id,
            to: targetEntity.hostname || targetEntity.id
          });
        }
      });
    });
    
    return connections;
  };

  // Handle entity interactions
  const handleEntityClick = (entity: InfrastructureEntity) => {
    setSelectedEntity(entity);
  };

  const handleEntityEdit = (entity: InfrastructureEntity) => {
    setEditingEntity(entity);
  };

  const handleEntityAdd = (parentEntity: InfrastructureEntity) => {
    // When adding to a parent entity, we can either show the add modal
    // or directly create a new entity related to the parent
    setShowAddNodeModal(true);
  };

  const handleEntityFidelityChange = (id: string, fidelity: FidelityLevel) => {
    engine.updateEntityFidelity(id, fidelity);
  };

  const handleAddNode = (entity: InfrastructureEntity) => {
    engine.addEntity(entity);
    setShowAddNodeModal(false);
  };

  const handleEntityUpdate = (updatedEntity: InfrastructureEntity) => {
    engine.updateEntity(updatedEntity.id, updatedEntity);
    setEditingEntity(null);
  };

  const handleApplyLayout = (newEntities: Record<string, InfrastructureEntity>) => {
    Object.values(newEntities).forEach(entity => {
      engine.updateEntity(entity.id, entity);
    });
  };

  // Handle entity save from details modal
  const handleEntitySave = async (updatedEntity: InfrastructureEntity) => {
    try {
      // Update entity in simulation engine
      engine.updateEntity(updatedEntity.id, updatedEntity);
      
      // Update vector memory if entity is an organization
      if (updatedEntity.type === EntityType.ORGANIZATION) {
        await syncEntityToVectorMemory(updatedEntity);
      }
      
      // Add success message to chat
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `✅ Entity "${updatedEntity.name}" updated successfully and synced to vector memory`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, successMessage]);
      
      // Close the details modal
      setSelectedEntity(null);
      
    } catch (error) {
      console.error('Failed to save entity:', error);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `❌ Failed to save entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      // Re-throw to let EntityDetails handle the error state
      throw error;
    }
  };

  // Sync individual entity to vector memory
  const syncEntityToVectorMemory = async (entity: InfrastructureEntity) => {
    try {
      if (entity.type === EntityType.ORGANIZATION) {
        // Convert entity to company memory record format
        const companyRecord = {
          id: entity.id,
          name: entity.name,
          description: entity.metadata.description || `${entity.name} organization`,
          sectorTags: entity.metadata.sectorTags || [],
          services: entity.metadata.coreFunctions || [],
          metadata: {
            ...entity.metadata,
            hostname: entity.hostname,
            ip: entity.ip,
            fidelity: entity.fidelity,
            lastUpdated: new Date().toISOString()
          },
          infrastructure: entity.metadata.internalEntities || [],
          createdAt: entity.metadata.createdAt ? new Date(entity.metadata.createdAt) : new Date(),
          updatedAt: new Date()
        };

        // Update in vector memory
        await vectorService.updateCompanyInMemory(companyRecord);
        console.log(`✅ Synced entity ${entity.name} to vector memory`);
      }
    } catch (error) {
      console.error('Vector memory sync failed:', error);
      throw new Error(`Failed to sync to vector memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-screen flex bg-cyber-dark text-white relative">
      {/* Main Infrastructure View */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-cyan-400">Infrastructure Editor</h1>
            <div className="text-sm text-gray-400">
              {Object.keys(simulationState.entities).length} entities
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Export Button */}
            <button
              onClick={handleExportInfrastructure}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center space-x-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export JSON</span>
            </button>
            
            {/* Chat Toggle */}
            <button
              onClick={() => setChatPanelOpen(!chatPanelOpen)}
              className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded flex items-center space-x-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{chatPanelOpen ? 'Hide Chat' : 'Show Chat'}</span>
            </button>
            <button
              onClick={() => setShowAddNodeModal(true)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center space-x-2 transition-colors"
            >
              <span className="text-lg">➕</span>
              <span>Add Node</span>
            </button>
            
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded flex items-center space-x-2 transition-colors"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-1.162 1.98-1.162 2.28 0a1.5 1.5 0 002.145.978c1.134-.692 2.446.48 1.753 1.613a1.5 1.5 0 00.978 2.146c1.162.301 1.162 1.98 0 2.281a1.5 1.5 0 00-.978 2.146c.693 1.134-.619 2.305-1.753 1.613a1.5 1.5 0 00-2.145.978c-.3 1.162-1.98 1.162-2.28 0a1.5 1.5 0 00-2.145-.978c-1.134.692-2.446-.48-1.753-1.613a1.5 1.5 0 00-.978-2.146c-1.162-.301-1.162-1.98 0-2.281a1.5 1.5 0 00.978-2.146c-.692-1.134.62-2.305 1.753-1.613a1.5 1.5 0 002.145-.978z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Infrastructure Graph */}
        <div className="flex-1">
          <InfrastructureMap
            entities={simulationState.entities}
            onEntityClick={handleEntityClick}
            onEntityEdit={handleEntityEdit}
            onEntityAdd={handleEntityAdd}
            onEntityFidelityChange={handleEntityFidelityChange}
            onEntityUpdate={handleEntityUpdate}
            onEntityDelete={(id) => engine.removeEntity(id)}
          />
        </div>
      </div>

      {/* Chat Panel */}
      {chatPanelOpen && (
        <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col">
          {/* Chat Header */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
            <h3 className="font-semibold text-cyan-400">AI Assistant</h3>
            <p className="text-xs text-gray-400">Natural language infrastructure modeling</p>
          </div>

          {/* Chat Messages */}
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

          {/* Chat Input */}
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
              <p>Try: "Create a bank", "Add load balancer", "Connect web to db"</p>
            </div>
          </div>
        </div>
      )}

      {/* Entity Details Modal */}
      <EntityDetails
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onSave={handleEntitySave}
      />

      {/* Add Node Modal */}
      {showAddNodeModal && (
        <AddNodeModal
          isOpen={showAddNodeModal}
          onClose={() => setShowAddNodeModal(false)}
          onAdd={handleAddNode}
          existingEntities={simulationState.entities}
        />
      )}

      {/* Node Editor Panel */}
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