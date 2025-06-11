'use client';

import React, { useState } from 'react';
import { InfrastructureEntity, EntityType, FidelityLevel, Port } from '../types/infrastructure';

interface NodeEditorPanelProps {
  entity: InfrastructureEntity | null;
  onClose: () => void;
  onSave: (entity: InfrastructureEntity) => void;
  onDelete: (id: string) => void;
}

const entityTypeOptions = [
  { value: EntityType.WEB_APP, label: 'Web Application', icon: '🖥️' },
  { value: EntityType.DATABASE, label: 'Database', icon: '🗄️' },
  { value: EntityType.API_SERVICE, label: 'API Service', icon: '🔌' },
  { value: EntityType.LOAD_BALANCER, label: 'Load Balancer', icon: '⚖️' },
  { value: EntityType.FIREWALL, label: 'Firewall', icon: '🛡️' },
  { value: EntityType.DNS_SERVER, label: 'DNS Server', icon: '🌐' },
  { value: EntityType.NTP_SERVER, label: 'NTP Server', icon: '⏰' },
  { value: 'data_feed' as EntityType, label: 'Data Feed', icon: '📡' },
  { value: 'external_source' as EntityType, label: 'External Source', icon: '🌍' },
];

export const NodeEditorPanel: React.FC<NodeEditorPanelProps> = ({
  entity,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editedEntity, setEditedEntity] = useState<InfrastructureEntity | null>(entity);
  const [newPort, setNewPort] = useState({ number: 80, protocol: 'tcp' as 'tcp' | 'udp', service: 'http' });

  React.useEffect(() => {
    setEditedEntity(entity);
  }, [entity]);

  if (!entity || !editedEntity) return null;

  const handleSave = () => {
    if (editedEntity) {
      onSave(editedEntity);
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${entity.name}"?`)) {
      onDelete(entity.id);
      onClose();
    }
  };

  const addPort = () => {
    if (editedEntity && newPort.number > 0 && newPort.number <= 65535) {
      const port: Port = {
        number: newPort.number,
        protocol: newPort.protocol,
        service: newPort.service,
        status: 'open'
      };
      
      setEditedEntity({
        ...editedEntity,
        ports: [...editedEntity.ports, port]
      });
      
      setNewPort({ number: 80, protocol: 'tcp', service: 'http' });
    }
  };

  const removePort = (index: number) => {
    if (editedEntity) {
      setEditedEntity({
        ...editedEntity,
        ports: editedEntity.ports.filter((_, i) => i !== index)
      });
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 shadow-xl z-50 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Node</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Basic Info */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={editedEntity.name}
              onChange={(e) => setEditedEntity({ ...editedEntity, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Hostname</label>
            <input
              type="text"
              value={editedEntity.hostname}
              onChange={(e) => setEditedEntity({ ...editedEntity, hostname: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">IP Address</label>
            <input
              type="text"
              value={editedEntity.ip}
              onChange={(e) => setEditedEntity({ ...editedEntity, ip: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              value={editedEntity.type}
              onChange={(e) => setEditedEntity({ ...editedEntity, type: e.target.value as EntityType })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
            >
              {entityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={editedEntity.metadata.description || ''}
              onChange={(e) => setEditedEntity({
                ...editedEntity,
                metadata: { ...editedEntity.metadata, description: e.target.value }
              })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
              rows={3}
            />
          </div>
        </div>

        {/* Ports Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Ports</h3>
          
          {/* Existing Ports */}
          <div className="space-y-2 mb-4">
            {editedEntity.ports.map((port, index) => (
              <div key={index} className="flex items-center space-x-2 bg-gray-800 p-2 rounded">
                <span className="text-white">{port.number}/{port.protocol}</span>
                <span className="text-gray-300 flex-1">{port.service}</span>
                <button
                  onClick={() => removePort(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add New Port */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Port"
                value={newPort.number}
                onChange={(e) => setNewPort({ ...newPort, number: parseInt(e.target.value) || 80 })}
                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                min="1"
                max="65535"
              />
              <select
                value={newPort.protocol}
                onChange={(e) => setNewPort({ ...newPort, protocol: e.target.value as 'tcp' | 'udp' })}
                className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Service name"
                value={newPort.service}
                onChange={(e) => setNewPort({ ...newPort, service: e.target.value })}
                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
              <button
                onClick={addPort}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};