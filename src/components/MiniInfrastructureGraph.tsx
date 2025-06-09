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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { InfrastructureEntity, FidelityLevel } from '../types/infrastructure';
import { EntityNode } from './EntityNode';

const nodeTypes = {
  entity: EntityNode,
};

interface MiniInfrastructureGraphProps {
  entities: InfrastructureEntity[];
  onEntityClick: (entity: InfrastructureEntity) => void;
  onEntityFidelityChange: (id: string, fidelity: FidelityLevel) => void;
}

export const MiniInfrastructureGraph: React.FC<MiniInfrastructureGraphProps> = ({
  entities,
  onEntityClick,
  onEntityFidelityChange,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert entities to React Flow nodes
  useEffect(() => {
    const flowNodes: Node[] = entities.map((entity) => ({
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
    entities.forEach((entity) => {
      entity.connections.forEach((connId) => {
        const targetEntity = entities.find(e => e.id === connId);
        if (targetEntity) {
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
    <div className="h-full w-full bg-gray-900 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="rounded-lg"
      >
        <Controls className="bg-gray-800 border-gray-600" />
        <Background color="#374151" gap={16} />
      </ReactFlow>
    </div>
  );
};