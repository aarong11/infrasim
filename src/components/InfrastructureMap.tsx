'use client';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { InfrastructureEntity, FidelityLevel } from '../types/infrastructure';
import { EntityNode } from './EntityNode';
import LayoutManager, { LayoutOptions } from './LayoutManager';

const nodeTypes = {
  entity: EntityNode,
};

const GRID_SIZE = 80;
const snapToGrid = (position: { x: number; y: number }) => ({
  x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
});

interface InfrastructureMapProps {
  entities: Record<string, InfrastructureEntity>;
  onEntityClick: (entity: InfrastructureEntity) => void;
  onEntityFidelityChange: (id: string, fidelity: FidelityLevel) => void;
  onEntityDelete?: (id: string) => void;
  onEntityEdit?: (entity: InfrastructureEntity) => void;
  onEntityAdd?: (parentEntity: InfrastructureEntity) => void;
  onEntityUpdate?: (entity: InfrastructureEntity) => void;
  onConnectionCreate?: (sourceId: string, targetId: string) => void;
  onConnectionDelete?: (sourceId: string, targetId: string) => void;
  selectedEntityId?: string;
}

const InfrastructureMapInner: React.FC<InfrastructureMapProps> = ({
  entities,
  onEntityClick,
  onEntityFidelityChange,
  onEntityDelete,
  onEntityEdit,
  onEntityAdd,
  onEntityUpdate,
  onConnectionCreate,
  onConnectionDelete,
  selectedEntityId,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [hasAppliedInitialLayout, setHasAppliedInitialLayout] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const layoutManagerRef = useRef<LayoutManager>(new LayoutManager('infrastructure-layout'));
  const { fitView, getViewport, setViewport } = useReactFlow();
  const layoutTimeoutRef = useRef<NodeJS.Timeout>();
  const entitiesRef = useRef<Record<string, InfrastructureEntity>>({});

  // Track when entities change for proper layout timing
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  // Convert entities to React Flow nodes and edges
  useEffect(() => {
    if (Object.keys(entities).length === 0) {
      setNodes([]);
      setEdges([]);
      setHasAppliedInitialLayout(false);
      setIsInitialLoad(true);
      return;
    }

    // Create React Flow nodes
    const flowNodes: Node[] = Object.values(entities).map((entity) => ({
      id: entity.id,
      type: 'entity',
      position: entity.position,
      data: {
        entity,
        onEntityClick,
        onEntityFidelityChange,
        onEntityDelete,
        onEntityEdit,
        onEntityAdd,
        isSelected: selectedEntityId === entity.id,
      },
    }));

    // Create React Flow edges
    const flowEdges: Edge[] = [];
    Object.values(entities).forEach((entity) => {
      entity.connections.forEach((connId) => {
        if (entities[connId]) {
          flowEdges.push({
            id: `${entity.id}-${connId}`,
            source: entity.id,
            target: connId,
            type: 'smoothstep',
            style: { stroke: '#00ffff', strokeWidth: 2 },
            animated: true,
          });
        }
      });
    });

    setNodes(flowNodes);
    setEdges(flowEdges);

    // Apply layout after nodes are rendered (only on initial load or when entities change significantly)
    if (isInitialLoad && !hasAppliedInitialLayout) {
      // Clear any existing timeout
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }

      // Wait for nodes to be fully rendered before applying layout
      layoutTimeoutRef.current = setTimeout(() => {
        applyInitialLayout();
      }, 100); // Small delay to ensure nodes are rendered
    }
  }, [entities, onEntityClick, onEntityFidelityChange, onEntityDelete, onEntityEdit, onEntityAdd, selectedEntityId, isInitialLoad, hasAppliedInitialLayout]);

  // Apply initial automatic layout
  const applyInitialLayout = useCallback(async () => {
    const currentEntities = entitiesRef.current;
    if (Object.keys(currentEntities).length === 0) return;

    setIsLayouting(true);
    const layoutManager = layoutManagerRef.current;

    try {
      let positions: Record<string, { x: number; y: number }> | null = null;
      
      // Check if we have saved user positions
      if (layoutManager.hasSavedLayout(currentEntities)) {
        positions = layoutManager.loadSavedLayout(currentEntities);
        console.log('📍 Restored saved user layout');
      } else {
        // Generate automatic layout for first time
        console.log('🎯 Generating automatic initial layout...');
        positions = await layoutManager.generateAutoLayout(currentEntities, {
          algorithm: 'layered',
          direction: 'RIGHT',
          nodeSpacing: 200,
          layerSpacing: 300,
        });
      }

      // Update entity positions if we have new positions
      if (positions && onEntityUpdate) {
        let hasChanges = false;
        Object.entries(positions).forEach(([entityId, position]) => {
          const entity = currentEntities[entityId];
          if (entity && (entity.position.x !== position.x || entity.position.y !== position.y)) {
            onEntityUpdate({
              ...entity,
              position,
            });
            hasChanges = true;
          }
        });

        if (hasChanges) {
          // Fit view to show all nodes after layout
          setTimeout(() => {
            fitView({ padding: 0.1, duration: 800 });
          }, 200);
        }
      }

      setHasAppliedInitialLayout(true);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('❌ Initial layout failed:', error);
    } finally {
      setIsLayouting(false);
    }
  }, [onEntityUpdate, fitView]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && onConnectionCreate) {
        onConnectionCreate(params.source, params.target);
      }
      
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        style: { stroke: '#00ffff', strokeWidth: 2 },
        animated: true,
      }, eds));
    },
    [onConnectionCreate, setEdges]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      edgesToDelete.forEach((edge) => {
        if (onConnectionDelete && edge.source && edge.target) {
          onConnectionDelete(edge.source, edge.target);
        }
      });
    },
    [onConnectionDelete]
  );

  // Handle node position changes with grid snapping and saving
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const processedChanges = changes.map((change) => {
        if (change.type === 'position' && change.position) {
          if (change.dragging === false) {
            // User finished dragging - snap to grid and save
            const snappedPosition = snapToGrid(change.position);
            
            // Update entity position in the backend
            if (onEntityUpdate && entities[change.id]) {
              const entity = entities[change.id];
              const updatedEntity = {
                ...entity,
                position: snappedPosition,
              };
              onEntityUpdate(updatedEntity);
              
              // Save the layout after user moves nodes
              setTimeout(() => {
                const layoutManager = layoutManagerRef.current;
                layoutManager.saveLayout(entities);
                console.log('💾 Saved user layout to localStorage');
              }, 100);
            }
            
            return {
              ...change,
              position: snappedPosition,
            };
          }
        }
        return change;
      });
      
      onNodesChange(processedChanges);
    },
    [onNodesChange, onEntityUpdate, entities]
  );

  // Manual auto-layout trigger
  const triggerAutoLayout = useCallback(async () => {
    if (Object.keys(entities).length === 0) return;
    
    setIsLayouting(true);
    const layoutManager = layoutManagerRef.current;
    
    try {
      console.log('🔄 Applying manual auto-layout...');
      
      // Clear saved layout and generate new one
      layoutManager.clearSavedLayout();
      const positions = await layoutManager.generateAutoLayout(entities, {
        algorithm: 'layered',
        direction: 'RIGHT',
        nodeSpacing: 200,
        layerSpacing: 300,
      });
      
      // Update all entity positions
      if (onEntityUpdate) {
        Object.entries(positions).forEach(([entityId, position]) => {
          const entity = entities[entityId];
          if (entity) {
            onEntityUpdate({
              ...entity,
              position,
            });
          }
        });
      }

      // Fit view after layout
      setTimeout(() => {
        fitView({ padding: 0.1, duration: 800 });
      }, 200);
    } catch (error) {
      console.error('❌ Manual layout failed:', error);
    } finally {
      setIsLayouting(false);
    }
  }, [entities, onEntityUpdate, fitView]);

  // Reset layout and clear saved positions
  const resetLayout = useCallback(() => {
    layoutManagerRef.current.clearSavedLayout();
    setHasAppliedInitialLayout(false);
    setIsInitialLoad(true);
    console.log('🗑️ Reset layout - cleared saved positions');
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full w-full bg-cyber-dark relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView={false} // We'll control fit view manually
        className="bg-cyber-dark"
        snapToGrid={true}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls className="bg-gray-800 border-cyan-400" />
        <Background 
          color={showGrid ? "#00ffff" : "transparent"} 
          gap={GRID_SIZE} 
          size={showGrid ? 1 : 0}
          style={{ opacity: showGrid ? 0.15 : 0 }}
        />
        
        {/* Layout Control Panel */}
        <Panel position="top-right" className="flex flex-col gap-2 p-2">
          {isLayouting && (
            <div className="bg-cyan-900/90 text-cyan-300 px-3 py-2 rounded border border-cyan-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
              Applying layout...
            </div>
          )}
          
          <button
            onClick={triggerAutoLayout}
            disabled={isLayouting || Object.keys(entities).length === 0}
            className="bg-cyan-900/80 hover:bg-cyan-800/80 text-cyan-300 px-3 py-2 rounded border border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Apply automatic layout to all nodes"
          >
            🎯 Auto Layout
          </button>
          
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="bg-gray-900/80 hover:bg-gray-800/80 text-gray-300 px-3 py-2 rounded border border-gray-500 transition-colors"
            title="Toggle grid visibility"
          >
            {showGrid ? '🔲' : '⬜'} Grid
          </button>
          
          <button
            onClick={() => fitView({ padding: 0.1, duration: 800 })}
            className="bg-blue-900/80 hover:bg-blue-800/80 text-blue-300 px-3 py-2 rounded border border-blue-500 transition-colors"
            title="Fit all nodes in view"
          >
            🔍 Fit View
          </button>
          
          <button
            onClick={resetLayout}
            className="bg-red-900/80 hover:bg-red-800/80 text-red-300 px-3 py-2 rounded border border-red-500 transition-colors"
            title="Reset layout and clear saved positions"
          >
            🗑️ Reset
          </button>
        </Panel>

        {/* Status Panel */}
        <Panel position="bottom-left" className="text-cyan-300 text-sm bg-cyber-dark/80 px-2 py-1 rounded border border-cyan-500/30">
          Nodes: {Object.keys(entities).length} | Snap Grid: {GRID_SIZE}px
          {hasAppliedInitialLayout && (
            <span className="ml-2 text-green-400">✓ Layout Applied</span>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const InfrastructureMap: React.FC<InfrastructureMapProps> = (props) => {
  return (
    <ReactFlowProvider>
      <InfrastructureMapInner {...props} />
    </ReactFlowProvider>
  );
};

// Keep the old export for backward compatibility
export const InfrastructureMapWithProvider = InfrastructureMap;
