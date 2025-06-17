import React, { useEffect, useState } from 'react';
import { DAOData } from './types';

interface RolesSetupStepProps {
  data: DAOData;
  onUpdate: (field: keyof DAOData, value: any) => void;
  onValidationChange: (isValid: boolean) => void;
}

interface Role {
  name: string;
  description: string;
  permissions: string[];
  walletAddress?: string;
}

const DEFAULT_PERMISSIONS = [
  'Voting Rights',
  'Proposal Creation',
  'Treasury Access',
  'Admin Rights',
  'Member Management',
  'Contract Upgrades',
  'Financial Operations',
  'Strategic Decisions'
];

export function RolesSetupStep({ data, onUpdate, onValidationChange }: RolesSetupStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string>('');

  // Try to get current wallet address from internal wallet system
  useEffect(() => {
    try {
      const walletData = localStorage.getItem('webauthn-wallet-address');
      if (walletData) {
        setCurrentWalletAddress(walletData);
      } else {
        const internalWalletAddress = getInternalWalletAddress();
        if (internalWalletAddress) {
          setCurrentWalletAddress(internalWalletAddress);
        }
      }
    } catch (error) {
      console.warn('Could not access internal wallet:', error);
    }
  }, []);

  const getInternalWalletAddress = (): string | null => {
    if (typeof window !== 'undefined') {
      const globalWallet = (window as any).__INFRASIM_WALLET__;
      if (globalWallet && globalWallet.address) {
        return globalWallet.address;
      }
    }
    return null;
  };

  const generateNewWallet = async () => {
    try {
      const newAddress = generateSampleAddress();
      setCurrentWalletAddress(newAddress);
      localStorage.setItem('webauthn-wallet-address', newAddress);
      return newAddress;
    } catch (error) {
      console.error('Failed to generate new wallet:', error);
      return null;
    }
  };

  const generateSampleAddress = (): string => {
    const hex = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return hex;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (data.roles.length === 0) {
      newErrors.roles = 'At least one role is required';
    } else {
      const roleNames = data.roles.map(r => r.name.toLowerCase());
      const duplicates = roleNames.filter((name, index) => roleNames.indexOf(name) !== index);
      if (duplicates.length > 0) {
        newErrors.roles = 'Role names must be unique';
      }
      
      const walletAddresses = data.roles
        .map(r => r.walletAddress?.toLowerCase())
        .filter(addr => addr && addr.trim());
      const duplicateAddresses = walletAddresses.filter((addr, index) => walletAddresses.indexOf(addr) !== index);
      if (duplicateAddresses.length > 0) {
        newErrors.roles = 'Wallet addresses must be unique';
      }
      
      data.roles.forEach((role, index) => {
        if (!role.name.trim()) {
          newErrors.roles = `Role ${index + 1} name is required`;
        }
        if (!role.description.trim()) {
          newErrors.roles = `Role ${index + 1} description is required`;
        }
        if (role.walletAddress && role.walletAddress.trim() && !/^0x[a-fA-F0-9]{40}$/.test(role.walletAddress)) {
          newErrors.roles = `Role ${index + 1} has invalid wallet address format`;
        }
      });
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidationChange(isValid);
    return isValid;
  };

  useEffect(() => {
    validateForm();
  }, [data.roles]);

  const addRole = () => {
    const newRole: Role = {
      name: '',
      description: '',
      permissions: [],
      walletAddress: ''
    };
    onUpdate('roles', [...data.roles, newRole]);
  };

  const updateRole = (index: number, field: keyof Role, value: any) => {
    const updatedRoles = [...data.roles];
    updatedRoles[index] = { ...updatedRoles[index], [field]: value };
    onUpdate('roles', updatedRoles);
  };

  const removeRole = (index: number) => {
    const updatedRoles = data.roles.filter((_, i) => i !== index);
    onUpdate('roles', updatedRoles);
  };

  const togglePermission = (roleIndex: number, permission: string) => {
    const role = data.roles[roleIndex];
    const permissions = role.permissions.includes(permission)
      ? role.permissions.filter(p => p !== permission)
      : [...role.permissions, permission];
    updateRole(roleIndex, 'permissions', permissions);
  };

  const addPresetRole = (preset: 'founder' | 'member' | 'advisor') => {
    const presets = {
      founder: {
        name: 'Founder',
        description: 'Founding member with full administrative rights',
        permissions: ['Voting Rights', 'Proposal Creation', 'Treasury Access', 'Admin Rights', 'Member Management', 'Contract Upgrades'],
        walletAddress: ''
      },
      member: {
        name: 'Member',
        description: 'Regular member with voting and proposal rights',
        permissions: ['Voting Rights', 'Proposal Creation'],
        walletAddress: ''
      },
      advisor: {
        name: 'Advisor',
        description: 'Advisory role with limited voting rights',
        permissions: ['Voting Rights'],
        walletAddress: ''
      }
    };
    
    onUpdate('roles', [...data.roles, presets[preset]]);
  };

  const setCurrentWalletForRole = (roleIndex: number) => {
    if (currentWalletAddress) {
      updateRole(roleIndex, 'walletAddress', currentWalletAddress);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Roles & Permissions</h2>
        <p className="text-gray-400">
          Define the different roles within your DAO, their permissions, and assign wallet addresses. These roles will be used in the share allocation step.
        </p>
      </div>

      <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-blue-400">🔐</div>
            <div>
              <h4 className="text-blue-400 font-medium">Internal Wallet</h4>
              {currentWalletAddress ? (
                <p className="text-gray-300 text-sm font-mono">{currentWalletAddress}</p>
              ) : (
                <p className="text-gray-400 text-sm">No wallet generated yet</p>
              )}
              <p className="text-gray-400 text-xs">
                {currentWalletAddress 
                  ? "You can assign this wallet to any role using the \"Use My Wallet\" button"
                  : "Generate a wallet to assign to roles"
                }
              </p>
            </div>
          </div>
          {!currentWalletAddress && (
            <button
              onClick={generateNewWallet}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm transition-colors"
            >
              Generate Wallet
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => addPresetRole('founder')}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
        >
          + Add Founder Role
        </button>
        <button
          onClick={() => addPresetRole('member')}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
        >
          + Add Member Role
        </button>
        <button
          onClick={() => addPresetRole('advisor')}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
        >
          + Add Advisor Role
        </button>
        <button
          onClick={addRole}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
        >
          + Add Custom Role
        </button>
      </div>

      {errors.roles && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
          <p className="text-red-400 text-sm">{errors.roles}</p>
        </div>
      )}

      <div className="space-y-4">
        {data.roles.map((role, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Role {index + 1}</h3>
              <button
                onClick={() => removeRole(index)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={role.name}
                  onChange={(e) => updateRole(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="e.g. Founder, Member, Advisor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={role.description}
                  onChange={(e) => updateRole(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Brief description of this role"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wallet Address (Optional)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={role.walletAddress || ''}
                  onChange={(e) => updateRole(index, 'walletAddress', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                  placeholder="0x..."
                />
                {currentWalletAddress && (
                  <button
                    onClick={() => setCurrentWalletForRole(index)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors whitespace-nowrap"
                  >
                    Use My Wallet
                  </button>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Assign a wallet address to this role. Uses internal wallet system - no MetaMask required.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Permissions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DEFAULT_PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={role.permissions.includes(permission)}
                      onChange={() => togglePermission(index, permission)}
                      className="rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-300">{permission}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.roles.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-600 rounded-lg">
          <p className="text-gray-400 mb-4">No roles defined yet</p>
          <button
            onClick={addRole}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
          >
            Add Your First Role
          </button>
        </div>
      )}

      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-400 mt-0.5">⚠️</div>
          <div>
            <h4 className="text-yellow-400 font-medium mb-1">Role Guidelines</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Role names must be unique within your DAO</li>
              <li>• Wallet addresses must be unique if provided</li>
              <li>• Consider creating a hierarchy: Founder → Member → Advisor</li>
              <li>• Permissions can be modified after deployment through governance</li>
              <li>• Treasury access should be limited to trusted roles</li>
              <li>• You can assign wallet addresses now or later in the share allocation step</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-green-400 mt-0.5">🔐</div>
          <div>
            <h4 className="text-green-400 font-medium mb-1">Internal Wallet System</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Uses secure WebAuthn-based wallet generation</li>
              <li>• No browser extension or MetaMask required</li>
              <li>• Wallet addresses are generated locally and securely</li>
              <li>• Private keys are managed by the browser's secure enclave</li>
              <li>• Compatible with all modern browsers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}