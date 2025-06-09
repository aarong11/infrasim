'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { InfrastructureEntity, FidelityLevel, EntityType } from '../types/infrastructure';

interface EntityNodeProps {
  data: {
    entity: InfrastructureEntity;
    onEntityClick: (entity: InfrastructureEntity) => void;
    onEntityFidelityChange: (id: string, fidelity: FidelityLevel) => void;
  };
}

const getEntityIcon = (type: EntityType): string => {
  const icons = {
    [EntityType.DNS_SERVER]: '🌐',
    [EntityType.NTP_SERVER]: '⏰',
    [EntityType.WEB_APP]: '🖥️',
    [EntityType.DATABASE]: '🗄️',
    [EntityType.FIREWALL]: '🛡️',
    [EntityType.LOAD_BALANCER]: '⚖️',
    [EntityType.SOCIAL_AGENT]: '👤',
    [EntityType.API_SERVICE]: '🔌',
    [EntityType.ORGANIZATION]: '🏢',
  };
  return icons[type] || '📦';
};

const getFidelityColor = (fidelity: FidelityLevel): string => {
  const colors = {
    [FidelityLevel.VIRTUAL]: 'border-gray-500 bg-gray-800',
    [FidelityLevel.SEMI_REAL]: 'border-yellow-500 bg-yellow-900',
    [FidelityLevel.CONCRETE]: 'border-green-500 bg-green-900',
  };
  return colors[fidelity];
};

export const EntityNode: React.FC<EntityNodeProps> = ({ data }) => {
  const { entity, onEntityClick, onEntityFidelityChange } = data;

  const cycleFidelity = (e: React.MouseEvent) => {
    e.stopPropagation();
    const levels = [FidelityLevel.VIRTUAL, FidelityLevel.SEMI_REAL, FidelityLevel.CONCRETE];
    const currentIndex = levels.indexOf(entity.fidelity);
    const nextIndex = (currentIndex + 1) % levels.length;
    onEntityFidelityChange(entity.id, levels[nextIndex]);
  };

  return (
    <div
      className={`px-4 py-2 shadow-lg rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${getFidelityColor(entity.fidelity)}`}
      onClick={() => onEntityClick(entity)}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-400" />
      
      <div className="flex items-center space-x-2">
        <span className="text-2xl">{getEntityIcon(entity.type)}</span>
        <div>
          <div className="font-bold text-white text-sm">{entity.name}</div>
          <div className="text-xs text-gray-300">{entity.hostname}</div>
          <div className="text-xs text-gray-400">{entity.ip}</div>
        </div>
      </div>
      
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs text-gray-400">{entity.type}</span>
        <button
          onClick={cycleFidelity}
          className="text-xs px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white"
        >
          {entity.fidelity}
        </button>
      </div>
      
      {entity.ports.length > 0 && (
        <div className="mt-1 text-xs text-gray-400">
          Ports: {entity.ports.map(p => p.number).join(', ')}
        </div>
      )}
      
      {/* Badges for API services */}
      {(entity.type === EntityType.API_SERVICE || entity.type === EntityType.WEB_APP) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entity.metadata.endpoints && entity.metadata.endpoints.length > 0 && (
            <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded">
              {entity.metadata.endpoints.length} endpoints
            </span>
          )}
          {entity.metadata.compliance && entity.metadata.compliance.length > 0 && (
            <span className="text-xs px-2 py-1 bg-yellow-600 text-white rounded">
              {entity.metadata.compliance.join(', ')}
            </span>
          )}
          {entity.metadata.openAPIStub && Object.keys(entity.metadata.openAPIStub).length > 0 && (
            <span className="text-xs px-2 py-1 bg-green-600 text-white rounded">
              API
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-400" />
    </div>
  );
};
