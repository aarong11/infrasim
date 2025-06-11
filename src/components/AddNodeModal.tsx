'use client';

import React, { useState } from 'react';
import { InfrastructureEntity, EntityType, FidelityLevel, Port } from '../types/infrastructure';
import { v4 as uuidv4 } from 'uuid';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (entity: InfrastructureEntity) => void;
  existingEntities: Record<string, InfrastructureEntity>;
}

const entityTypeOptions = [
  { value: EntityType.WEB_APP, label: 'Web Application', icon: '🖥️', defaultPorts: [{ number: 80, protocol: 'tcp' as const, service: 'http' }, { number: 443, protocol: 'tcp' as const, service: 'https' }] },
  { value: EntityType.DATABASE, label: 'Database', icon: '🗄️', defaultPorts: [{ number: 5432, protocol: 'tcp' as const, service: 'postgresql' }] },
  { value: EntityType.API_SERVICE, label: 'API Service', icon: '🔌', defaultPorts: [{ number: 8080, protocol: 'tcp' as const, service: 'http-api' }] },
  { value: EntityType.LOAD_BALANCER, label: 'Load Balancer', icon: '⚖️', defaultPorts: [{ number: 80, protocol: 'tcp' as const, service: 'http' }, { number: 443, protocol: 'tcp' as const, service: 'https' }] },
  { value: EntityType.FIREWALL, label: 'Firewall', icon: '🛡️', defaultPorts: [] },
  { value: EntityType.DNS_SERVER, label: 'DNS Server', icon: '🌐', defaultPorts: [{ number: 53, protocol: 'udp' as const, service: 'dns' }] },
  { value: EntityType.NTP_SERVER, label: 'NTP Server', icon: '⏰', defaultPorts: [{ number: 123, protocol: 'udp' as const, service: 'ntp' }] },
  { value: 'data_feed' as EntityType, label: 'Data Feed', icon: '📡', defaultPorts: [{ number: 443, protocol: 'tcp' as const, service: 'https' }] },
  { value: 'external_source' as EntityType, label: 'External Source', icon: '🌍', defaultPorts: [{ number: 443, protocol: 'tcp' as const, service: 'https' }] },
];

const GRID_SIZE = 80;

const snapToGrid = (position: { x: number; y: number }) => ({
  x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
});

const findAvailableGridPosition = (existingEntities: Record<string, InfrastructureEntity>) => {
  const occupiedPositions = new Set(
    Object.values(existingEntities).map(entity => `${entity.position.x},${entity.position.y}`)
  );

  // Start from top-left and find first available grid position
  for (let y = 100; y < 1000; y += GRID_SIZE) {
    for (let x = 100; x < 1200; x += GRID_SIZE) {
      const posKey = `${x},${y}`;
      if (!occupiedPositions.has(posKey)) {
        return { x, y };
      }
    }
  }

  // Fallback to random position if grid is full
  return {
    x: Math.floor(Math.random() * 800) + 100,
    y: Math.floor(Math.random() * 600) + 100,
  };
};

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingEntities,
}) => {
  const [selectedType, setSelectedType] = useState<EntityType>(EntityType.WEB_APP);
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [ip, setIp] = useState('');
  const [description, setDescription] = useState('');
  const [ports, setPorts] = useState<Port[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      // Reset form
      setName('');
      setHostname('');
      setIp('');
      setDescription('');
      
      // Set default ports for selected type
      const selectedOption = entityTypeOptions.find(opt => opt.value === selectedType);
      if (selectedOption) {
        setPorts(selectedOption.defaultPorts.map(port => ({ ...port, status: 'open' as const })));
      }
      
      // Generate default IP
      setIp(`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`);
    }
  }, [isOpen, selectedType]);

  React.useEffect(() => {
    if (name) {
      // Auto-generate hostname from name
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      setHostname(`${cleanName}.local`);
    }
  }, [name]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!name.trim()) {
      alert('Please enter a name for the node');
      return;
    }

    const position = findAvailableGridPosition(existingEntities);

    const newEntity: InfrastructureEntity = {
      id: uuidv4(),
      type: selectedType,
      name: name.trim(),
      hostname: hostname.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.local`,
      ip: ip.trim() || `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      fidelity: FidelityLevel.VIRTUAL,
      ports,
      metadata: {
        description: description.trim(),
        createdAt: new Date().toISOString(),
      },
      position: snapToGrid(position),
      connections: [],
      logs: [],
    };

    onAdd(newEntity);
    onClose();
  };

  const handleTypeChange = (type: EntityType) => {
    setSelectedType(type);
    const selectedOption = entityTypeOptions.find(opt => opt.value === type);
    if (selectedOption) {
      setPorts(selectedOption.defaultPorts.map(port => ({ ...port, status: 'open' as const })));
    }
  };

  const addPort = () => {
    setPorts([...ports, { number: 80, protocol: 'tcp', service: 'http', status: 'open' }]);
  };

  const removePort = (index: number) => {
    setPorts(ports.filter((_, i) => i !== index));
  };

  const updatePort = (index: number, field: keyof Port, value: any) => {
    setPorts(ports.map((port, i) => i === index ? { ...port, [field]: value } : port));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-[500px] max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Add Infrastructure Node</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">Node Type</label>
            <div className="grid grid-cols-3 gap-2">
              {entityTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTypeChange(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedType === option.value
                      ? 'border-cyan-400 bg-cyan-900 text-white'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-xs">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter node name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hostname</label>
              <input
                type="text"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="Auto-generated from name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">IP Address</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.x.x"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this node's purpose"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                rows={3}
              />
            </div>
          </div>

          {/* Ports */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Ports</label>
              <button
                onClick={addPort}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                + Add Port
              </button>
            </div>
            
            <div className="space-y-2">
              {ports.map((port, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-800 p-2 rounded">
                  <input
                    type="number"
                    value={port.number}
                    onChange={(e) => updatePort(index, 'number', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    min="1"
                    max="65535"
                  />
                  <select
                    value={port.protocol}
                    onChange={(e) => updatePort(index, 'protocol', e.target.value)}
                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>
                  <input
                    type="text"
                    value={port.service}
                    onChange={(e) => updatePort(index, 'service', e.target.value)}
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    placeholder="Service"
                  />
                  <button
                    onClick={() => removePort(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleAdd}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Add Node
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
    </div>
  );
};