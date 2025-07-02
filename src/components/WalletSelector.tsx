'use client';

import React from 'react';
import { Shield, Info, ChevronRight, CheckCircle } from 'lucide-react';
import { WalletType, WALLET_CONFIGS } from '../types/wallet-types';
import { useAppStore } from '../store/app-store';
import { WalletInfoModal } from './WalletInfoModal';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: WalletType) => void;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({ 
  isOpen, 
  onClose, 
  onSelect 
}) => {
  const { 
    selectedWalletType, 
    showWalletInfo, 
    walletInfoType,
    setShowWalletInfo 
  } = useAppStore();

  if (!isOpen) return null;

  const handleSelectWallet = (type: WalletType) => {
    onSelect(type);
    onClose();
  };

  const handleShowInfo = (type: WalletType, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowWalletInfo(true, type);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9999] backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[9999]">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Select Wallet Type</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Choose how you want to manage your wallet and credentials
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {Object.values(WALLET_CONFIGS).map((config) => (
            <div
              key={config.type}
              onClick={() => handleSelectWallet(config.type)}
              className={`
                relative p-4 border rounded-lg cursor-pointer transition-all
                ${config.isAvailable 
                  ? 'hover:bg-gray-800/50 border-gray-700 hover:border-gray-600' 
                  : 'opacity-50 cursor-not-allowed border-gray-800'
                }
                ${selectedWalletType === config.type 
                  ? 'bg-cyan-900/20 border-cyan-600' 
                  : ''
                }
              `}
            >
              {/* Selection Indicator */}
              {selectedWalletType === config.type && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-5 h-5 text-cyan-400" />
                </div>
              )}

              <div className="flex items-start space-x-3">
                <span className="text-2xl flex-shrink-0 mt-1">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-white">{config.name}</h3>
                    {config.type === WalletType.WEBAUTHN && (
                      <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
                        Recommended
                      </span>
                    )}
                    {!config.isAvailable && (
                      <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                    {config.description}
                  </p>
                  
                  {/* Key Features */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {config.features.slice(0, 3).map((feature, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                    {config.features.length > 3 && (
                      <span className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded">
                        +{config.features.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Button */}
              <button
                onClick={(e) => handleShowInfo(config.type, e)}
                className="absolute bottom-3 right-3 p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                title="Learn more"
              >
                <Info className="w-4 h-4" />
              </button>

              {/* Selection Arrow */}
              {config.isAvailable && (
                <ChevronRight className="absolute top-1/2 right-8 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 p-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-xs">
              You can change wallet type anytime in settings
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Info Modal */}
      {walletInfoType && (
        <WalletInfoModal
          isOpen={showWalletInfo}
          walletType={walletInfoType}
          onClose={() => setShowWalletInfo(false)}
        />
      )}
    </>
  );
};
