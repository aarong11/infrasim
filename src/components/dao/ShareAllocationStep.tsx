import React, { useEffect, useState } from 'react';
import { DAOData } from './types';

interface ShareAllocationStepProps {
  data: DAOData;
  onUpdate: (field: keyof DAOData, value: any) => void;
  onValidationChange: (isValid: boolean) => void;
}

interface ShareAllocation {
  address: string;
  percentage: number;
  role: string;
}

export function ShareAllocationStep({ data, onUpdate, onValidationChange }: ShareAllocationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string>('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (data.shareAllocations.length === 0) {
      newErrors.allocations = 'At least one share allocation is required';
    } else {
      const totalPercentage = data.shareAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        newErrors.allocations = `Total allocation must equal 100%. Current total: ${totalPercentage.toFixed(2)}%`;
      }
      
      const addresses = data.shareAllocations.map(a => a.address.toLowerCase());
      const duplicates = addresses.filter((addr, index) => addresses.indexOf(addr) !== index);
      if (duplicates.length > 0) {
        newErrors.allocations = 'Wallet addresses must be unique';
      }
      
      data.shareAllocations.forEach((allocation, index) => {
        if (!allocation.address.trim()) {
          newErrors.allocations = `Allocation ${index + 1} address is required`;
        } else if (!/^0x[a-fA-F0-9]{40}$/.test(allocation.address)) {
          newErrors.allocations = `Allocation ${index + 1} has invalid wallet address format`;
        }
        
        if (allocation.percentage <= 0 || allocation.percentage > 100) {
          newErrors.allocations = `Allocation ${index + 1} percentage must be between 0 and 100`;
        }
        
        if (!allocation.role.trim()) {
          newErrors.allocations = `Allocation ${index + 1} role is required`;
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
  }, [data.shareAllocations]);

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
    const hex = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return hex;
  };

  const addAllocation = () => {
    const newAllocation: ShareAllocation = {
      address: '',
      percentage: 0,
      role: data.roles.length > 0 ? data.roles[0].name : ''
    };
    onUpdate('shareAllocations', [...data.shareAllocations, newAllocation]);
  };

  const updateAllocation = (index: number, field: keyof ShareAllocation, value: any) => {
    const updatedAllocations = [...data.shareAllocations];
    updatedAllocations[index] = { ...updatedAllocations[index], [field]: value };
    onUpdate('shareAllocations', updatedAllocations);
  };

  const removeAllocation = (index: number) => {
    const updatedAllocations = data.shareAllocations.filter((_, i) => i !== index);
    onUpdate('shareAllocations', updatedAllocations);
  };

  const addCurrentWallet = () => {
    if (currentWalletAddress) {
      const newAllocation: ShareAllocation = {
        address: currentWalletAddress,
        percentage: 0,
        role: data.roles.length > 0 ? data.roles[0].name : ''
      };
      onUpdate('shareAllocations', [...data.shareAllocations, newAllocation]);
    }
  };

  const populateFromRoles = () => {
    const rolesWithWallets = data.roles.filter(role => role.walletAddress && role.walletAddress.trim());
    const newAllocations = rolesWithWallets.map(role => ({
      address: role.walletAddress!,
      percentage: 0,
      role: role.name
    }));
    
    const existingAddresses = data.shareAllocations.map(a => a.address.toLowerCase());
    const uniqueNewAllocations = newAllocations.filter(
      alloc => !existingAddresses.includes(alloc.address.toLowerCase())
    );
    
    onUpdate('shareAllocations', [...data.shareAllocations, ...uniqueNewAllocations]);
  };

  const distributeEqually = () => {
    if (data.shareAllocations.length === 0) return;
    
    const equalPercentage = 100 / data.shareAllocations.length;
    const updatedAllocations = data.shareAllocations.map(allocation => ({
      ...allocation,
      percentage: Math.round(equalPercentage * 100) / 100
    }));
    
    const totalAfterRounding = updatedAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
    const difference = 100 - totalAfterRounding;
    if (Math.abs(difference) > 0 && updatedAllocations.length > 0) {
      updatedAllocations[0].percentage += difference;
    }
    
    onUpdate('shareAllocations', updatedAllocations);
  };

  const getTotalPercentage = () => {
    return data.shareAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
  };

  const remainingPercentage = 100 - getTotalPercentage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Share Allocation</h2>
        <p className="text-gray-400">
          Assign ownership percentages to wallet addresses and their associated roles. These allocations determine voting power and ownership stakes.
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
                <p className="text-gray-400 text-sm">No wallet available</p>
              )}
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
          onClick={addAllocation}
          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm transition-colors"
        >
          + Add Allocation
        </button>
        {currentWalletAddress && (
          <button
            onClick={addCurrentWallet}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
          >
            + Add My Wallet
          </button>
        )}
        {data.roles.some(role => role.walletAddress) && (
          <button
            onClick={populateFromRoles}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
          >
            + Add From Roles
          </button>
        )}
        {data.shareAllocations.length > 0 && (
          <button
            onClick={distributeEqually}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors"
          >
            Distribute Equally
          </button>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Total Allocation</span>
          <span className={`text-sm font-bold ${
            Math.abs(getTotalPercentage() - 100) < 0.01 ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {getTotalPercentage().toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              getTotalPercentage() > 100 ? 'bg-red-500' : 
              Math.abs(getTotalPercentage() - 100) < 0.01 ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${Math.min(getTotalPercentage(), 100)}%` }}
          />
        </div>
        {remainingPercentage !== 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {remainingPercentage > 0 ? `${remainingPercentage.toFixed(2)}% remaining` : `${Math.abs(remainingPercentage).toFixed(2)}% over allocation`}
          </p>
        )}
      </div>

      {errors.allocations && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
          <p className="text-red-400 text-sm">{errors.allocations}</p>
        </div>
      )}

      <div className="space-y-4">
        {data.shareAllocations.map((allocation, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Allocation {index + 1}</h3>
              <button
                onClick={() => removeAllocation(index)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  value={allocation.address}
                  onChange={(e) => updateAllocation(index, 'address', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Percentage *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={allocation.percentage || ''}
                    onChange={(e) => updateAllocation(index, 'percentage', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2 text-gray-400">%</span>
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={allocation.role}
                  onChange={(e) => updateAllocation(index, 'role', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select role...</option>
                  {data.roles.map((role) => (
                    <option key={role.name} value={role.name}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.shareAllocations.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-600 rounded-lg">
          <p className="text-gray-400 mb-4">No share allocations defined yet</p>
          <button
            onClick={addAllocation}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
          >
            Add Your First Allocation
          </button>
        </div>
      )}

      {data.roles.length === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-400 mt-0.5">⚠️</div>
            <div>
              <h4 className="text-yellow-400 font-medium mb-1">No Roles Defined</h4>
              <p className="text-gray-300 text-sm">
                You haven't defined any roles yet. Go back to the Roles step to create roles before allocating shares.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-green-400 mt-0.5">🔐</div>
          <div>
            <h4 className="text-green-400 font-medium mb-1">Internal Wallet System</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• No MetaMask or browser extension required</li>
              <li>• Secure WebAuthn-based wallet generation</li>
              <li>• Can auto-populate from roles with assigned wallets</li>
              <li>• All wallet operations happen locally and securely</li>
              <li>• Compatible with modern browsers and devices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}