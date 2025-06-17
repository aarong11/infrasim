import React, { useEffect, useState } from 'react';
import { DAOData } from './types';

interface ConstitutionStepProps {
  data: DAOData;
  onUpdate: (field: keyof DAOData, value: any) => void;
  onValidationChange: (isValid: boolean) => void;
}

const CONSTITUTION_TEMPLATE = `# DAO Constitution

## Article I: Purpose and Mission
This DAO exists to [INSERT PURPOSE FROM STEP 1].

## Article II: Governance Structure
The governance of this DAO shall be conducted through a decentralized voting mechanism where token holders participate in decision-making processes.

## Article III: Membership
Membership is determined by token ownership and role assignments as defined in the initial allocation.

## Article IV: Voting Rights
- Voting power is proportional to token holdings
- Quorum requirements: [TO BE DEFINED]
- Proposal threshold: [TO BE DEFINED]

## Article V: Treasury Management
- Treasury funds shall be managed collectively through governance proposals
- Multi-signature requirements for large transactions
- Transparent reporting of all financial activities

## Article VI: Amendments
This constitution may be amended through a governance vote requiring [TO BE DEFINED]% approval.`;

const CEREMONIES_TEMPLATE = `# DAO Ceremonies and Rituals

## Onboarding Ceremony
New members shall be welcomed through:
1. Introduction to DAO values and mission
2. Role assignment and responsibility briefing
3. Access to communication channels and tools

## Monthly Governance Calls
- First Monday of each month
- Review proposals and discuss strategic direction
- Open forum for member concerns

## Quarterly Reviews
- Financial performance assessment
- Goal setting and milestone tracking
- Community feedback and improvements

## Annual Assembly
- Comprehensive review of DAO performance
- Election of key positions (if applicable)
- Strategic planning for the following year

## Conflict Resolution Process
1. Direct dialogue between parties
2. Mediation by neutral DAO members
3. Community vote if necessary
4. Final arbitration mechanism`;

export function ConstitutionStep({ data, onUpdate, onValidationChange }: ConstitutionStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!data.constitution.trim()) {
      newErrors.constitution = 'Constitution is required';
    } else if (data.constitution.length < 100) {
      newErrors.constitution = 'Constitution must be at least 100 characters';
    }
    
    if (!data.ceremonies.trim()) {
      newErrors.ceremonies = 'Ceremonies document is required';
    } else if (data.ceremonies.length < 50) {
      newErrors.ceremonies = 'Ceremonies document must be at least 50 characters';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidationChange(isValid);
    return isValid;
  };

  useEffect(() => {
    validateForm();
  }, [data.constitution, data.ceremonies]);

  const loadTemplate = (type: 'constitution' | 'ceremonies') => {
    if (type === 'constitution') {
      const template = CONSTITUTION_TEMPLATE.replace('[INSERT PURPOSE FROM STEP 1]', data.purpose || '[DEFINE YOUR PURPOSE]');
      onUpdate('constitution', template);
    } else {
      onUpdate('ceremonies', CEREMONIES_TEMPLATE);
    }
  };

  const handleInputChange = (field: keyof DAOData, value: string) => {
    onUpdate(field, value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Constitution & Ceremonies</h2>
        <p className="text-gray-400">
          Define the governance structure and cultural practices of your DAO. These documents will guide how your organization operates and makes decisions.
        </p>
      </div>

      {/* Constitution Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Constitution</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => loadTemplate('constitution')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              Load Template
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-300">{data.constitution}</pre>
            </div>
          </div>
        ) : (
          <div>
            <textarea
              value={data.constitution}
              onChange={(e) => handleInputChange('constitution', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm ${
                errors.constitution ? 'border-red-500' : 'border-gray-600'
              }`}
              rows={12}
              placeholder="Define your DAO's constitution, governance structure, and operational rules..."
            />
            {errors.constitution && <p className="text-red-400 text-sm mt-1">{errors.constitution}</p>}
            <p className="text-gray-500 text-xs mt-1">
              Use Markdown formatting. Include governance rules, voting procedures, and organizational structure.
            </p>
          </div>
        )}
      </div>

      {/* Ceremonies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Ceremonies & Rituals</h3>
          <button
            onClick={() => loadTemplate('ceremonies')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            Load Template
          </button>
        </div>

        <div>
          <textarea
            value={data.ceremonies}
            onChange={(e) => handleInputChange('ceremonies', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm ${
              errors.ceremonies ? 'border-red-500' : 'border-gray-600'
            }`}
            rows={8}
            placeholder="Define regular ceremonies, meetings, onboarding processes, and cultural practices..."
          />
          {errors.ceremonies && <p className="text-red-400 text-sm mt-1">{errors.ceremonies}</p>}
          <p className="text-gray-500 text-xs mt-1">
            Document recurring activities, onboarding processes, and community rituals that build culture.
          </p>
        </div>
      </div>

      {/* Helper Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">Constitution Tips</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Define clear governance procedures</li>
            <li>• Set voting thresholds and quorum requirements</li>
            <li>• Include amendment procedures</li>
            <li>• Address treasury management</li>
            <li>• Consider dispute resolution mechanisms</li>
          </ul>
        </div>

        <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
          <h4 className="text-green-400 font-medium mb-2">Ceremony Ideas</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Regular community calls</li>
            <li>• New member onboarding rituals</li>
            <li>• Milestone celebrations</li>
            <li>• Quarterly planning sessions</li>
            <li>• Annual assemblies</li>
          </ul>
        </div>
      </div>

      <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-purple-400 mt-0.5">📜</div>
          <div>
            <h4 className="text-purple-400 font-medium mb-1">Legal Considerations</h4>
            <p className="text-gray-300 text-sm">
              These documents will be stored on-chain and serve as the foundational governance framework. 
              Consider consulting with legal experts familiar with DAO structures in your jurisdiction before finalizing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}