'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { InfrastructureEntity, FidelityLevel } from '../types/infrastructure';
import { EntityNode } from './EntityNode';

const nodeTypes = {
  entity: EntityNode,
};

interface InfrastructureMapProps {
  entities: Record<string, InfrastructureEntity>;
  onEntityClick: (entity: InfrastructureEntity) => void;
  onEntityFidelityChange: (id: string, fidelity: FidelityLevel) => void;
}

export const InfrastructureMap: React.FC<InfrastructureMapProps> = ({
  entities,
  onEntityClick,
  onEntityFidelityChange,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert entities to React Flow nodes
  useEffect(() => {
    const flowNodes: Node[] = Object.values(entities).map((entity) => ({
      id: entity.id,
      type: 'entity',
      position: entity.position,
      data: {
        entity,
        onEntityClick,
        onEntityFidelityChange,
      },
    }));

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
          });
        }
      });
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [entities, onEntityClick, onEntityFidelityChange, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="h-full w-full bg-cyber-dark">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-cyber-dark"
      >
        <Controls className="bg-gray-800 border-cyan-400" />
        <Background color="#00ffff" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
};
