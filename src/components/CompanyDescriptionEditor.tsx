'use client';

import React, { useState } from 'react';
import { CompanyMemoryRecord } from '../types/infrastructure';

interface CompanyDescriptionEditorProps {
  company: CompanyMemoryRecord | null;
  onUpdateDescription: (companyId: string, description: string) => void;
  onClose: () => void;
}

export const CompanyDescriptionEditor: React.FC<CompanyDescriptionEditorProps> = ({
  company,
  onUpdateDescription,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  React.useEffect(() => {
    if (company) {
      setEditedDescription(company.description);
    }
  }, [company]);

  if (!company) return null;

  const handleSave = async () => {
    if (editedDescription.trim() !== company.description) {
      await onUpdateDescription(company.id, editedDescription.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDescription(company.description);
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-600 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="text-2xl mr-2">🏢</span>
          {company.name}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* Company Description */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Description</label>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-cyan-400 hover:text-cyan-300 text-sm"
            >
              ✏️ Edit
            </button>
          ) : (
            <div className="space-x-2">
              <button
                onClick={handleSave}
                className="text-green-400 hover:text-green-300 text-sm"
              >
                ✓ Save
              </button>
              <button
                onClick={handleCancel}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                ✗ Cancel
              </button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
            rows={4}
            placeholder="Enter company description..."
          />
        ) : (
          <p className="text-gray-300 bg-gray-700 p-3 rounded-lg">
            {company.description || 'No description available'}
          </p>
        )}
      </div>

      {/* Company Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Sector Tags</h3>
          <div className="flex flex-wrap gap-1">
            {company.sectorTags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Services</h3>
          <div className="flex flex-wrap gap-1">
            {company.services.map((service, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs"
              >
                {service}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Infrastructure</h3>
          <p className="text-gray-400 text-sm">
            {company.infrastructure?.length || 0} components
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Last Updated</h3>
          <p className="text-gray-400 text-sm">
            {new Date(company.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};