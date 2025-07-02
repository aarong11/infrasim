'use client';

import React from 'react';
import { useAppStore } from '@store/app-store';
import { MessageCircle } from 'lucide-react';
import { UnifiedWalletStatus } from './UnifiedWalletStatus';
import { WebAuthnWalletPopout } from './WebAuthnWalletPopout';

export const CommunicationBar: React.FC = () => {
  const { showChat, setShowChat, showWallet, setShowWallet } = useAppStore();

  const handleChatToggle = () => {
    if (!showChat && showWallet) {
      // If chat is being opened and wallet is open, close wallet first
      setShowWallet(false);
    }
    setShowChat(!showChat);
  };

  const handleWalletToggle = () => {
    if (!showWallet && showChat) {
      // If wallet is being opened and chat is open, close chat first
      setShowChat(false);
    }
    setShowWallet(!showWallet);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gray-900 border-t border-gray-700 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left side - Chat Button and Wallet */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleChatToggle}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                showChat
                  ? 'bg-green-900/40 text-green-300 border border-green-700/50'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-gray-600/50'
              }`}
              title="Toggle AI Chat"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              AI Assistant
              {showChat && (
                <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </button>

            {/* Wallet Status - with click handler to show popout */}
            <div onClick={handleWalletToggle}>
              <UnifiedWalletStatus />
            </div>
          </div>

          {/* Right side - Future communication buttons */}
          <div className="flex items-center space-x-4">
            {/* ...existing placeholder buttons... */}
          </div>
        </div>
      </div>

      {/* Wallet Popout */}
      <WebAuthnWalletPopout 
        isOpen={showWallet}
        onClose={() => setShowWallet(false)}
      />
    </>
  );
};