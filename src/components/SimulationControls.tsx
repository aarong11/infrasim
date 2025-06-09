'use client';

import React from 'react';
import { SimulationState } from '../types/infrastructure';

interface SimulationControlsProps {
  state: SimulationState;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  state,
  onStart,
  onStop,
  onReset,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Simulation Controls</h3>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <button
            onClick={state.isRunning ? onStop : onStart}
            className={`px-4 py-2 rounded font-medium ${
              state.isRunning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {state.isRunning ? 'Stop' : 'Start'} Simulation
          </button>
          
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
          >
            Reset
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Clock Tick:</span>
            <span className="ml-2 text-white font-mono">{state.clock}</span>
          </div>
          
          <div>
            <span className="text-gray-400">Entities:</span>
            <span className="ml-2 text-white font-mono">{Object.keys(state.entities).length}</span>
          </div>
          
          <div>
            <span className="text-gray-400">Status:</span>
            <span className={`ml-2 font-mono ${state.isRunning ? 'text-green-400' : 'text-red-400'}`}>
              {state.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-400">Tick Rate:</span>
            <span className="ml-2 text-white font-mono">{state.tickRate}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
