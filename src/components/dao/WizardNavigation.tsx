import React from 'react';

interface WizardNavigationProps {
  steps: Array<{ key: string; title: string; description: string }>;
  currentStep: string;
  onStepClick: (step: any) => void;
  currentStepIndex: number;
}

export function WizardNavigation({ steps, currentStep, onStepClick, currentStepIndex }: WizardNavigationProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex items-center">
              <button
                onClick={() => onStepClick(step.key)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  index <= currentStepIndex
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {index + 1}
              </button>
              <div className="ml-3">
                <div className={`text-sm font-medium ${
                  step.key === currentStep ? 'text-cyan-400' : 'text-gray-400'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                index < currentStepIndex ? 'bg-cyan-600' : 'bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}