'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { SimulationEngine } from '../core/simulation-engine';
import { CompanyMemoryRecord, InfrastructureEntity, EntityType, FidelityLevel } from '../types/infrastructure';
import { InfrastructureMap } from './InfrastructureMap';
import { EntityDetails } from './EntityDetails';
import { AddNodeModal } from './AddNodeModal';

interface CompanyInfrastructureProps {
  companyId: string;
}

export const CompanyInfrastructure: React.FC<CompanyInfrastructureProps> = ({ companyId }) => {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyMemoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<InfrastructureEntity | null>(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [entities, setEntities] = useState<Record<string, InfrastructureEntity>>({});
  const [engine] = useState(() => new SimulationEngine());
  const vectorService = new ClientVectorMemoryService();

  useEffect(() => {
    const unsubscribe = engine.subscribe((state) => {
      setEntities(state.entities);
    });
    return unsubscribe;
  }, [engine]);

  useEffect(() => {
    loadCompanyAndInfrastructure();
  }, [companyId]);

  const loadCompanyAndInfrastructure = async () => {
    try {
      setLoading(true);
      const companies = await vectorService.getAllCompaniesFromMemory();
      const foundCompany = companies.find(c => c.id === companyId);
      
      if (foundCompany) {
        setCompany(foundCompany);
        
        // Clear existing entities
        Object.keys(engine.getState().entities).forEach(id => {
          engine.removeEntity(id);
        });

        // Check if company has infrastructure
        if (foundCompany.infrastructure && foundCompany.infrastructure.length > 0) {
          console.log(`Loading existing infrastructure for ${foundCompany.name}`);
          
          // Create organization entity
          const orgEntity: InfrastructureEntity = {
            id: foundCompany.id,
            type: EntityType.ORGANIZATION,
            name: foundCompany.name,
            hostname: `${foundCompany.name.toLowerCase().replace(/\s+/g, '')}.local`,
            ip: '192.168.1.1',
            fidelity: FidelityLevel.VIRTUAL,
            ports: [],
            metadata: {
              description: foundCompany.description,
              coreFunctions: foundCompany.services,
              sectorTags: foundCompany.sectorTags,
              internalEntities: foundCompany.infrastructure,
              loadedFromMemory: true,
              originalCompanyRecord: foundCompany
            },
            position: { x: 400, y: 300 },
            connections: [],
            logs: [],
          };
          
          engine.addEntity(orgEntity);
          
          // Add infrastructure entities
          foundCompany.infrastructure.forEach(infraEntity => {
            engine.addEntity(infraEntity);
          });
          
        } else {
          console.log(`No existing infrastructure found for ${foundCompany.name}, generating new infrastructure...`);
          
          // Generate infrastructure using existing logic
          const description = `${foundCompany.name}: ${foundCompany.description}. Services: ${foundCompany.services.join(', ')}. Sector: ${foundCompany.sectorTags.join(', ')}.`;
          const fullOrganization = await vectorService.createRootOrganizationWithMemory(description);
          
          const orgEntity: InfrastructureEntity = {
            id: fullOrganization.id || foundCompany.id,
            type: EntityType.ORGANIZATION,
            name: fullOrganization.name || foundCompany.name,
            hostname: fullOrganization.hostname || `${foundCompany.name.toLowerCase().replace(/\s+/g, '')}.local`,
            ip: fullOrganization.ip || '192.168.1.1',
            fidelity: fullOrganization.fidelity || FidelityLevel.VIRTUAL,
            ports: fullOrganization.ports || [],
            metadata: {
              ...fullOrganization.metadata,
              description: foundCompany.description,
              coreFunctions: foundCompany.services,
              sectorTags: foundCompany.sectorTags,
              internalEntities: fullOrganization.metadata?.internalEntities || [],
              generatedInfrastructure: true,
              originalCompanyRecord: foundCompany
            },
            position: fullOrganization.position || { x: 400, y: 300 },
            connections: fullOrganization.connections || [],
            logs: fullOrganization.logs || [],
            apiSpec: fullOrganization.apiSpec
          };
          
          engine.addEntity(orgEntity);
          
          // Add internal entities
          const internalEntities = orgEntity.metadata.internalEntities || [];
          internalEntities.forEach(internalEntity => {
            engine.addEntity(internalEntity);
          });
        }
      } else {
        setError('Company not found');
      }
    } catch (err) {
      console.error('Failed to load company infrastructure:', err);
      setError('Failed to load company infrastructure');
    } finally {
      setLoading(false);
    }
  };

  const handleEntitySelect = (entity: InfrastructureEntity) => {
    setSelectedEntity(entity);
  };

  const handleEntityUpdate = (updatedEntity: InfrastructureEntity) => {
    engine.updateEntity(updatedEntity.id, updatedEntity);
  };

  const handleEntitySave = async (updatedEntity: InfrastructureEntity) => {
    try {
      engine.updateEntity(updatedEntity.id, updatedEntity);
      
      // Update company record if this is an organization entity
      if (updatedEntity.type === EntityType.ORGANIZATION && company) {
        const companyRecord = {
          ...company,
          name: updatedEntity.name,
          description: updatedEntity.metadata.description || company.description,
          sectorTags: updatedEntity.metadata.sectorTags || company.sectorTags,
          services: updatedEntity.metadata.coreFunctions || company.services,
          metadata: {
            ...company.metadata,
            ...updatedEntity.metadata,
            lastUpdated: new Date().toISOString()
          },
          infrastructure: updatedEntity.metadata.internalEntities || [],
          updatedAt: new Date()
        };
        await vectorService.updateCompanyInMemory(companyRecord);
        setCompany(companyRecord);
      }
      
      setSelectedEntity(null);
    } catch (error) {
      console.error('Failed to save entity:', error);
      throw error;
    }
  };

  const handleAddNode = (entity: InfrastructureEntity) => {
    engine.addEntity(entity);
    setShowAddNodeModal(false);
  };

  const handleConnectionCreate = (sourceId: string, targetId: string) => {
    const sourceEntity = entities[sourceId];
    const targetEntity = entities[targetId];
    
    if (sourceEntity && targetEntity) {
      if (!sourceEntity.connections.includes(targetId)) {
        const updatedSource = {
          ...sourceEntity,
          connections: [...sourceEntity.connections, targetId]
        };
        engine.updateEntity(sourceId, updatedSource);
      }
    }
  };

  const handleConnectionDelete = (sourceId: string, targetId: string) => {
    const sourceEntity = entities[sourceId];
    
    if (sourceEntity) {
      const updatedSource = {
        ...sourceEntity,
        connections: sourceEntity.connections.filter(id => id !== targetId)
      };
      engine.updateEntity(sourceId, updatedSource);
    }
  };

  const handleBackToDashboard = () => {
    router.push(`/company/${companyId}/dashboard`);
  };

  const handleExportInfrastructure = () => {
    try {
      const exportData = {
        metadata: {
          companyId,
          companyName: company?.name,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          generator: 'InfraSim Company Infrastructure View'
        },
        topology: {
          entities: Object.values(entities),
          connections: extractConnections()
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${company?.name || 'company'}-infrastructure-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const extractConnections = () => {
    const connections: Array<{ from: string; to: string }> = [];
    
    Object.values(entities).forEach(entity => {
      entity.connections.forEach(targetId => {
        const targetEntity = entities[targetId];
        if (targetEntity) {
          connections.push({
            from: entity.hostname || entity.id,
            to: targetEntity.hostname || targetId
          });
        }
      });
    });
    
    return connections;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-xl text-gray-400">Loading company infrastructure...</h3>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl text-gray-400 mb-2">Error</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="text-gray-400 hover:text-white transition-colors"
              title="Back to Dashboard"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-white">
              {company.name} - Infrastructure
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {Object.keys(entities).length} components
            </span>
            <button
              onClick={handleExportInfrastructure}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
              title="Export Infrastructure"
            >
              📥 Export
            </button>
            <button
              onClick={() => setShowAddNodeModal(true)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              title="Add Infrastructure Node"
            >
              ➕ Add Node
            </button>
          </div>
        </div>
      </div>

      {/* Infrastructure Map */}
      <div className="flex-1 relative">
        {Object.keys(entities).length > 0 ? (
          <InfrastructureMap
            entities={entities}
            onEntityClick={handleEntitySelect}
            onEntityEdit={handleEntitySelect}
            onEntityAdd={() => setShowAddNodeModal(true)}
            onEntityFidelityChange={(id, fidelity) => engine.updateEntityFidelity(id, fidelity)}
            onEntityUpdate={handleEntityUpdate}
            onEntityDelete={(id) => engine.removeEntity(id)}
            onConnectionCreate={handleConnectionCreate}
            onConnectionDelete={handleConnectionDelete}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-xl text-gray-400 mb-2">No Infrastructure Components</h3>
              <p className="text-gray-500 mb-4">Start by adding some infrastructure components</p>
              <button
                onClick={() => setShowAddNodeModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Add First Component
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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
          existingEntities={entities}
        />
      )}
    </div>
  );
};