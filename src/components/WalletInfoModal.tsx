'use client';

import React from 'react';
import { X, Shield, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { WalletType, WALLET_CONFIGS } from '../types/wallet-types';
import { useAppStore } from '../store/app-store';

interface WalletInfoModalProps {
  isOpen: boolean;
  walletType: WalletType;
  onClose: () => void;
}

export const WalletInfoModal: React.FC<WalletInfoModalProps> = ({ 
  isOpen, 
  walletType, 
  onClose 
}) => {
  if (!isOpen) return null;

  const config = WALLET_CONFIGS[walletType];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[10000] backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] max-h-[80vh] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[10001] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{config.icon}</span>
              <h2 className="text-xl font-semibold text-white">{config.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-300 text-lg leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
              Key Features
            </h3>
            <ul className="space-y-2">
              {config.features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-300">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Setup Instructions */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center">
              <Info className="w-5 h-5 mr-2 text-blue-400" />
              Setup Instructions
            </h3>
            <div className="bg-blue-900/20 border border-blue-700/30 p-4 rounded-lg">
              <p className="text-blue-200">{config.setupInstructions}</p>
            </div>
          </div>

          {/* Pros and Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pros */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                Advantages
              </h3>
              <ul className="space-y-2">
                {config.pros.map((pro, index) => (
                  <li key={index} className="flex items-start text-gray-300">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-400" />
                Considerations
              </h3>
              <ul className="space-y-2">
                {config.cons.map((con, index) => (
                  <li key={index} className="flex items-start text-gray-300">
                    <AlertCircle className="w-4 h-4 mr-2 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Availability Status */}
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Availability:</span>
              <div className="flex items-center">
                {config.isAvailable ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    <span className="text-green-400 text-sm">Available</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                    <span className="text-red-400 text-sm">Not Available</span>
                  </>
                )}
              </div>
            </div>
            {!config.isAvailable && walletType === WalletType.WEBAUTHN && (
              <p className="text-red-300 text-sm mt-2">
                WebAuthn is not supported in this browser. Please use a modern browser with biometric authentication support.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
