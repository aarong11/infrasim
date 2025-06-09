import { useState, useCallback } from 'react';
import { InfrastructureEntity, EntityType, FidelityLevel } from '../types/infrastructure';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { v4 as uuidv4 } from 'uuid';

export interface UseEntityExpansionOptions {
  vectorService: ClientVectorMemoryService;
}

export const useEntityExpansion = ({ vectorService }: UseEntityExpansionOptions) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandedEntity, setExpandedEntity] = useState<InfrastructureEntity | null>(null);

  const expandEntity = useCallback(async (entity: InfrastructureEntity) => {
    if (entity.type !== EntityType.ORGANIZATION) return;
    
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log('🏢 Entity Expansion Started', {
      requestId,
      entityName: entity.name,
      entityType: entity.type,
      hasExistingInternalEntities: !!(entity.metadata.internalEntities && entity.metadata.internalEntities.length > 0),
      timestamp: new Date().toISOString()
    });
    
    setIsExpanding(true);
    setExpandedEntity(entity);

    try {
      // If already has internal entities, just show them
      if (entity.metadata.internalEntities && entity.metadata.internalEntities.length > 0) {
        console.log('♻️ Using Cached Internal Entities', {
          requestId,
          cachedEntitiesCount: entity.metadata.internalEntities.length,
          timestamp: new Date().toISOString()
        });
        setIsExpanding(false);
        return;
      }

      // Generate internal infrastructure using the vector service
      const description = `Generate detailed internal infrastructure for ${entity.name}. 
        Core functions: ${entity.metadata.coreFunctions?.join(', ') || 'General business operations'}
        Description: ${entity.metadata.description || 'Technology organization'}
        
        Create specific components like web applications, databases, API services, load balancers, etc.`;

      console.log('📤 Vector Service Request [Entity Expansion]', {
        requestId,
        description,
        entityName: entity.name,
        timestamp: new Date().toISOString()
      });

      const startTime = Date.now();
      // Use the API to parse infrastructure description
      const response = await fetch('/api/vector-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parseInfrastructure', description })
      });

      if (!response.ok) {
        throw new Error('Failed to parse infrastructure');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Infrastructure parsing failed');
      }

      const parsed = data.parsed;
      const duration = Date.now() - startTime;
      
      console.log('📥 Vector Service Response [Entity Expansion]', {
        requestId,
        entitiesGenerated: parsed.entities.length,
        connectionsGenerated: parsed.connections.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      // Convert parsed entities to internal entities
      const internalEntities: InfrastructureEntity[] = parsed.entities.map((entityData: any, index: number) => {
        const newEntity = {
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
        
        console.log('🔧 Generated Internal Entity', {
          requestId,
          entityName: newEntity.name,
          entityType: newEntity.type,
          hostname: newEntity.hostname,
          timestamp: new Date().toISOString()
        });
        
        return newEntity;
      });

      // Add connections between internal entities
      parsed.connections.forEach((conn: any) => {
        const fromEntity = internalEntities.find(e => 
          e.hostname === conn.from || e.name === conn.from
        );
        const toEntity = internalEntities.find(e => 
          e.hostname === conn.to || e.name === conn.to
        );
        
        if (fromEntity && toEntity) {
          fromEntity.connections.push(toEntity.id);
          console.log('🔗 Added Connection', {
            requestId,
            from: fromEntity.name,
            to: toEntity.name,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Update the entity with internal entities
      entity.metadata.internalEntities = internalEntities;
      
      console.log('✅ Entity Expansion Complete', {
        requestId,
        totalInternalEntities: internalEntities.length,
        totalConnections: parsed.connections.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Entity Expansion Failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        entityName: entity.name,
        timestamp: new Date().toISOString()
      });
      
      // Fallback to default internal entities
      const fallbackEntities = generateFallbackInternalEntities(entity);
      entity.metadata.internalEntities = fallbackEntities;
      
      console.log('🔄 Using Fallback Internal Entities', {
        requestId,
        fallbackEntitiesCount: fallbackEntities.length,
        timestamp: new Date().toISOString()
      });
    }

    setIsExpanding(false);
  }, [vectorService]);

  const closeExpansion = useCallback(() => {
    setExpandedEntity(null);
  }, []);

  return {
    expandEntity,
    closeExpansion,
    expandedEntity,
    isExpanding
  };
};

function generateFallbackInternalEntities(parentEntity: InfrastructureEntity): InfrastructureEntity[] {
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
}