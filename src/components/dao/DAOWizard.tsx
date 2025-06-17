'use client';
import React, { useReducer, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DAOData, DeploymentInfo, WizardStep } from './types';
import { CompanySetupStep } from './CompanySetupStep';
import { RolesSetupStep } from './RolesSetupStep';
import { ConstitutionStep } from './ConstitutionStep';
import { ShareAllocationStep } from './ShareAllocationStep';
import { DeployStep } from './DeployStep';
import { WizardNavigation } from './WizardNavigation';

interface WizardState {
  currentStep: WizardStep;
  data: DAOData;
  isValid: boolean;
}

type WizardAction = 
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'UPDATE_DATA'; field: keyof DAOData; value: any }
  | { type: 'SET_VALID'; valid: boolean }
  | { type: 'RESET' };

const initialData: DAOData = {
  name: '',
  symbol: '',
  purpose: '',
  jurisdiction: '',
  metadata: '',
  roles: [],
  constitution: '',
  ceremonies: '',
  shareAllocations: []
};

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'UPDATE_DATA':
      return { 
        ...state, 
        data: { ...state.data, [action.field]: action.value },
        isValid: false // Reset validation when data changes
      };
    case 'SET_VALID':
      return { ...state, isValid: action.valid };
    case 'RESET':
      return { currentStep: 'company', data: initialData, isValid: false };
    default:
      return state;
  }
};

const steps: Array<{ key: WizardStep; title: string; description: string }> = [
  { key: 'company', title: 'Company Setup', description: 'Basic information about your DAO' },
  { key: 'roles', title: 'Roles & Permissions', description: 'Define roles and responsibilities' },
  { key: 'constitution', title: 'Constitution & Ceremonies', description: 'Governance documents' },
  { key: 'shares', title: 'Share Allocation', description: 'Distribute ownership and voting power' },
  { key: 'deploy', title: 'Deploy DAO', description: 'Review and deploy your DAO' }
];

export function DAOWizard() {
  const [state, dispatch] = useReducer(wizardReducer, {
    currentStep: 'company',
    data: initialData,
    isValid: false
  });

  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch deployment info on mount
  useEffect(() => {
    fetchDeploymentData();
  }, []);

  const fetchDeploymentData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8546/deployment');
      if (!response.ok) {
        throw new Error(`Failed to fetch deployment info: ${response.statusText}`);
      }
      const data = await response.json();
      
      setDeploymentInfo({
        networkName: data.networkName || 'localhost',
        rpcEndpoint: data.rpcEndpoint || 'http://localhost:8545',
        daoFactoryAddress: data.contractsMap?.DAOFactory?.address
      });
      
      if (!data.contractsMap?.DAOFactory?.address) {
        throw new Error('DAOFactory address not found in deployment data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch deployment data';
      setError(errorMessage);
      console.error('Error fetching deployment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateData = (field: keyof DAOData, value: any) => {
    dispatch({ type: 'UPDATE_DATA', field, value });
  };

  const setStepValid = (valid: boolean) => {
    dispatch({ type: 'SET_VALID', valid });
  };

  const goToStep = (step: WizardStep) => {
    dispatch({ type: 'SET_STEP', step });
  };

  const nextStep = () => {
    const currentIndex = steps.findIndex(s => s.key === state.currentStep);
    if (currentIndex < steps.length - 1) {
      dispatch({ type: 'SET_STEP', step: steps[currentIndex + 1].key });
    }
  };

  const previousStep = () => {
    const currentIndex = steps.findIndex(s => s.key === state.currentStep);
    if (currentIndex > 0) {
      dispatch({ type: 'SET_STEP', step: steps[currentIndex - 1].key });
    }
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.key === state.currentStep);
  };

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 'company':
        return (
          <CompanySetupStep
            data={state.data}
            onUpdate={updateData}
            onValidationChange={setStepValid}
          />
        );
      case 'roles':
        return (
          <RolesSetupStep
            data={state.data}
            onUpdate={updateData}
            onValidationChange={setStepValid}
          />
        );
      case 'constitution':
        return (
          <ConstitutionStep
            data={state.data}
            onUpdate={updateData}
            onValidationChange={setStepValid}
          />
        );
      case 'shares':
        return (
          <ShareAllocationStep
            data={state.data}
            onUpdate={updateData}
            onValidationChange={setStepValid}
          />
        );
      case 'deploy':
        return (
          <DeployStep
            data={state.data}
            deploymentInfo={deploymentInfo}
            onUpdate={updateData}
            onValidationChange={setStepValid}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading deployment configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-red-900/20 border border-red-500 rounded-lg">
          <h2 className="text-xl font-bold text-red-400 mb-2">Configuration Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={fetchDeploymentData}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors mr-2"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.location.href = '/'}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">Create New DAO</h1>
              <p className="text-gray-400 text-sm">
                Configure and deploy your Decentralized Autonomous Organization
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-400 bg-gray-700 px-3 py-1 rounded">
            Step {getCurrentStepIndex() + 1} of {steps.length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <WizardNavigation
          steps={steps}
          currentStep={state.currentStep}
          onStepClick={goToStep}
          currentStepIndex={getCurrentStepIndex()}
        />

        <div className="bg-gray-800 rounded-lg p-8 mb-8 min-h-[600px]">
          {renderCurrentStep()}
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center bg-gray-800 rounded-lg p-6">
          <button
            onClick={previousStep}
            disabled={getCurrentStepIndex() === 0}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>←</span>
            <span>Previous</span>
          </button>

          <div className="text-center">
            <div className="text-sm text-gray-400 mb-1">
              {steps[getCurrentStepIndex()].title}
            </div>
            <div className="w-64 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((getCurrentStepIndex() + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={nextStep}
            disabled={getCurrentStepIndex() === steps.length - 1 || !state.isValid}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>{getCurrentStepIndex() === steps.length - 1 ? 'Complete' : 'Next'}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}