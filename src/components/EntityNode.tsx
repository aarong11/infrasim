'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { InfrastructureEntity, FidelityLevel, EntityType } from '../types/infrastructure';

interface EntityNodeProps {
  data: {
    entity: InfrastructureEntity;
    onEntityClick: (entity: InfrastructureEntity) => void;
    onEntityFidelityChange: (id: string, fidelity: FidelityLevel) => void;
    onEntityDelete?: (id: string) => void;
    onEntityEdit?: (entity: InfrastructureEntity) => void;
    onEntityAdd?: (parentEntity: InfrastructureEntity) => void;
    isSelected?: boolean;
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
    'data_feed': '📡', // New type for data feeds
    'external_source': '🌍', // New type for external sources
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
  const { entity, onEntityClick, onEntityFidelityChange, onEntityDelete, onEntityEdit, onEntityAdd, isSelected } = data;

  const cycleFidelity = (e: React.MouseEvent) => {
    e.stopPropagation();
    const levels = [FidelityLevel.VIRTUAL, FidelityLevel.SEMI_REAL, FidelityLevel.CONCRETE];
    const currentIndex = levels.indexOf(entity.fidelity);
    const nextIndex = (currentIndex + 1) % levels.length;
    onEntityFidelityChange(entity.id, levels[nextIndex]);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEntityDelete && confirm(`Are you sure you want to delete "${entity.name}"?`)) {
      onEntityDelete(entity.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEntityEdit) {
      onEntityEdit(entity);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEntityAdd) {
      onEntityAdd(entity);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEntityClick(entity);
  };

  return (
    <div
      className={`relative px-4 py-2 shadow-lg rounded-lg border-2 cursor-pointer transition-all hover:scale-105 min-w-[180px] ${getFidelityColor(entity.fidelity)} ${
        isSelected ? 'ring-2 ring-cyan-400' : ''
      }`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-400" />
      
      {/* Action buttons - positioned at top corners */}
      <div className="absolute -top-2 -left-2 flex space-x-1">
        {/* Add button */}
        {onEntityAdd && (
          <button
            onClick={handleAdd}
            className="w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs flex items-center justify-center transition-colors"
            title="Add component"
          >
            ➕
          </button>
        )}
        
        {/* Edit button */}
        {onEntityEdit && (
          <button
            onClick={handleEdit}
            className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs flex items-center justify-center transition-colors"
            title="Edit node"
          >
            ✏️
          </button>
        )}
      </div>

      {/* Delete button */}
      {onEntityDelete && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs flex items-center justify-center transition-colors"
          title="Delete node"
        >
          🗑️
        </button>
      )}
      
      <div className="flex items-center space-x-2">
        <span className="text-2xl">{getEntityIcon(entity.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm truncate">{entity.name}</div>
          <div className="text-xs text-gray-300 truncate">{entity.hostname}</div>
          <div className="text-xs text-gray-400">{entity.ip}</div>
        </div>
      </div>
      
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs text-gray-400 truncate">{entity.type.replace('_', ' ')}</span>
        <button
          onClick={cycleFidelity}
          className="text-xs px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
        >
          {entity.fidelity}
        </button>
      </div>
      
      {entity.ports.length > 0 && (
        <div className="mt-1 text-xs text-gray-400 truncate">
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

      {/* Special badge for data feeds */}
      {(entity.type === 'data_feed' || entity.type === 'external_source') && (
        <div className="mt-2">
          <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded">
            External Data
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-400" />
    </div>
  );
};
