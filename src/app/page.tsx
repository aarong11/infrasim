'use client';

import React, { useState, useEffect } from 'react';
import { SimulationEngine } from '../core/simulation-engine';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { CompanyGrid } from '../components/CompanyGrid';
import { EntityDetails } from '../components/EntityDetails';
import { ZoomModal } from '../components/ZoomModal';
import { PromptInput } from '../components/PromptInput';
import { SimulationControls } from '../components/SimulationControls';
import { CompanyMemoryPanel } from '../components/CompanyMemoryPanel';
import { DeveloperConsole } from '../components/DeveloperConsole';
import { useEntityExpansion } from '../hooks/useEntityExpansion';
import { InfrastructureEntity, SimulationState, FidelityLevel, EntityType, CompanyMemoryRecord } from '../types/infrastructure';

export default function Home() {
  const [engine] = useState(() => new SimulationEngine());
  const [vectorService] = useState(() => new ClientVectorMemoryService());
  const [simulationState, setSimulationState] = useState<SimulationState>(() => engine.getState());
  const [selectedEntity, setSelectedEntity] = useState<InfrastructureEntity | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'prompt' | 'memory' | 'developer'>('prompt');
  const [vectorMemoryReady, setVectorMemoryReady] = useState(false);

  // Entity expansion hook for hierarchical exploration
  const { expandEntity, closeExpansion, expandedEntity, isExpanding } = useEntityExpansion({
    vectorService
  });

  useEffect(() => {
    const unsubscribe = engine.subscribe(setSimulationState);
    return unsubscribe;
  }, [engine]);

  useEffect(() => {
    // Initialize vector memory on component mount
    const initializeVectorMemory = async () => {
      try {
        // Test the API connection
        await vectorService.getAllCompaniesFromMemory();
        setVectorMemoryReady(true);
        console.log('✅ Vector memory service initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize vector memory service:', error);
      }
    };

    initializeVectorMemory();
  }, [vectorService]);

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
      
      // Get the newly created entity and automatically expand it to show the modal
      const newEntity = engine.getState().entities[entityId];
      if (newEntity && newEntity.type === EntityType.ORGANIZATION) {
        // Automatically expand the organization to show internal infrastructure
        await expandEntity(newEntity);
      }
      
    } catch (error) {
      console.error('Error processing prompt:', error);
    }
    setIsProcessing(false);
  };

  const handleCompanyClick = async (entity: InfrastructureEntity) => {
    // When a company is clicked, expand it to show internal infrastructure
    await expandEntity(entity);
  };

  const handleEntityClick = async (entity: InfrastructureEntity) => {
    if (entity.type === EntityType.ORGANIZATION) {
      // Expand the organization to show internal infrastructure
      await expandEntity(entity);
    } else {
      // Show entity details for non-organization entities
      setSelectedEntity(entity);
    }
  };

  const handleCompanyMemorySelect = async (company: CompanyMemoryRecord) => {
    // Create an organization entity from the memory record
    setIsProcessing(true);
    try {
      // Clear existing entities first
      Object.keys(simulationState.entities).forEach(id => {
        engine.removeEntity(id);
      });

      // Create organization from memory record
      const orgEntity = {
        type: EntityType.ORGANIZATION,
        name: company.name,
        hostname: `${company.name.toLowerCase().replace(/\s+/g, '')}.local`,
        ip: '192.168.1.1',
        fidelity: FidelityLevel.VIRTUAL,
        ports: [],
        metadata: {
          description: company.description,
          coreFunctions: company.services,
          sectorTags: company.sectorTags,
          internalEntities: [],
          memorySource: true
        },
        position: { x: 400, y: 300 },
        connections: []
      };

      const entityId = engine.addEntity(orgEntity);
      console.log(`Created organization from memory: ${company.name}`);
      
    } catch (error) {
      console.error('Error creating organization from memory:', error);
    }
    setIsProcessing(false);
  };

  const handleEntityFidelityChange = (id: string, fidelity: FidelityLevel) => {
    engine.updateEntityFidelity(id, fidelity);
  };

  const handleStartSimulation = () => {
    engine.start();
  };

  const handleStopSimulation = () => {
    engine.stop();
  };

  const handleResetSimulation = () => {
    engine.stop();
    // Clear all entities
    Object.keys(simulationState.entities).forEach(id => {
      engine.removeEntity(id);
    });
    closeExpansion();
  };

  return (
    <div className="h-screen flex bg-cyber-dark text-white">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-96' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-900 border-r border-gray-700`}>
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-cyan-400">InfraSim</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ←
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                activeTab === 'prompt' 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💬 Prompt
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                activeTab === 'memory' 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🧠 Memory
            </button>
            <button
              onClick={() => setActiveTab('developer')}
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
                onStart={handleStartSimulation}
                onStop={handleStopSimulation}
                onReset={handleResetSimulation}
              />
              
              <div className="text-sm text-gray-400">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ul className="space-y-1 text-xs">
                  <li>• Click any company card to explore its infrastructure</li>
                  <li>• Navigate between graph, details, logs, and API tabs</li>
                  <li>• Use the filter to find specific companies</li>
                  <li>• Use simulation controls to run the environment</li>
                  <li>• Switch to Memory tab to manage company records</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'memory' && (
            <>
              {vectorMemoryReady ? (
                <CompanyMemoryPanel
                  vectorService={vectorService}
                  onCompanySelect={handleCompanyMemorySelect}
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
                <h3 className="font-semibold mb-2">Memory Features:</h3>
                <ul className="space-y-1 text-xs">
                  <li>• Add companies with descriptions and tags</li>
                  <li>• Search using natural language queries</li>
                  <li>• Find similar companies automatically</li>
                  <li>• Click companies to create organizations</li>
                  <li>• Data persists between sessions</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'developer' && (
            <div className="text-sm text-gray-400">
              <h3 className="font-semibold mb-2 text-cyan-400">Developer Console</h3>
              <p className="mb-4 text-xs">
                Test and debug vector memory API endpoints with a built-in HTTP client.
              </p>
              <div className="text-sm text-gray-400">
                <h4 className="font-semibold mb-2">Features:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Pre-configured API request templates</li>
                  <li>• Postman-style variable support</li>
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

      {/* Toggle sidebar button when closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-10 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded"
        >
          →
        </button>
      )}

      {/* Main content */}
      <div className="flex-1 relative">
        {activeTab === 'developer' ? (
          <DeveloperConsole />
        ) : (
          <CompanyGrid onCompanyClick={handleCompanyClick} />
        )}
      </div>

      {/* Zoom Modal for company exploration */}
      <ZoomModal
        entity={expandedEntity}
        onClose={closeExpansion}
        isExpanding={isExpanding}
      />

      {/* Entity details modal for individual components */}
      <EntityDetails
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />
    </div>
  );
}
