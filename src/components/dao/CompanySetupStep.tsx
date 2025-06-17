import React, { useEffect, useState } from 'react';
import { DAOData } from './types';

interface CompanySetupStepProps {
  data: DAOData;
  onUpdate: (field: keyof DAOData, value: any) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function CompanySetupStep({ data, onUpdate, onValidationChange }: CompanySetupStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!data.name.trim()) {
      newErrors.name = 'Company name is required';
    } else if (data.name.length < 2) {
      newErrors.name = 'Company name must be at least 2 characters';
    }
    
    if (!data.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    } else if (!/^[A-Z]{2,6}$/.test(data.symbol)) {
      newErrors.symbol = 'Symbol must be 2-6 uppercase letters';
    }
    
    if (!data.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    } else if (data.purpose.length < 10) {
      newErrors.purpose = 'Purpose must be at least 10 characters';
    }
    
    if (!data.jurisdiction.trim()) {
      newErrors.jurisdiction = 'Jurisdiction is required';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidationChange(isValid);
    return isValid;
  };

  useEffect(() => {
    validateForm();
  }, [data.name, data.symbol, data.purpose, data.jurisdiction, data.metadata]);

  const handleInputChange = (field: keyof DAOData, value: string) => {
    onUpdate(field, value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Company Setup</h2>
        <p className="text-gray-400">
          Provide basic information about your DAO. This information will be stored on-chain and used to identify your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              errors.name ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="e.g. Acme Digital Collective"
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Token Symbol *
          </label>
          <input
            type="text"
            value={data.symbol}
            onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              errors.symbol ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="e.g. ACME"
            maxLength={6}
          />
          {errors.symbol && <p className="text-red-400 text-sm mt-1">{errors.symbol}</p>}
          <p className="text-gray-500 text-xs mt-1">2-6 uppercase letters</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Purpose & Mission *
        </label>
        <textarea
          value={data.purpose}
          onChange={(e) => handleInputChange('purpose', e.target.value)}
          className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
            errors.purpose ? 'border-red-500' : 'border-gray-600'
          }`}
          rows={4}
          placeholder="Describe the purpose and mission of your DAO. What problems will it solve? What value will it create?"
        />
        {errors.purpose && <p className="text-red-400 text-sm mt-1">{errors.purpose}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Jurisdiction *
        </label>
        <select
          value={data.jurisdiction}
          onChange={(e) => handleInputChange('jurisdiction', e.target.value)}
          className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
            errors.jurisdiction ? 'border-red-500' : 'border-gray-600'
          }`}
        >
          <option value="">Select jurisdiction...</option>
          <option value="Delaware, USA">Delaware, USA</option>
          <option value="Wyoming, USA">Wyoming, USA</option>
          <option value="Switzerland">Switzerland</option>
          <option value="Singapore">Singapore</option>
          <option value="Cayman Islands">Cayman Islands</option>
          <option value="British Virgin Islands">British Virgin Islands</option>
          <option value="Estonia">Estonia</option>
          <option value="Malta">Malta</option>
          <option value="Other">Other</option>
        </select>
        {errors.jurisdiction && <p className="text-red-400 text-sm mt-1">{errors.jurisdiction}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Additional Metadata
        </label>
        <textarea
          value={data.metadata}
          onChange={(e) => handleInputChange('metadata', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          rows={3}
          placeholder="Any additional information, tags, or metadata about your DAO (optional)"
        />
        <p className="text-gray-500 text-xs mt-1">Optional: Include industry tags, contact information, or other relevant details</p>
      </div>

      <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-400 mt-0.5">ℹ️</div>
          <div>
            <h4 className="text-blue-400 font-medium mb-1">Important Note</h4>
            <p className="text-gray-300 text-sm">
              This information will be permanently stored on the blockchain. Make sure all details are accurate before proceeding to deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}