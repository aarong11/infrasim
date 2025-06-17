'use client';

import React from 'react';
import { useAppStore } from '../store/app-store';
import { MessageCircle, Radio, Hash, Megaphone } from 'lucide-react';
import { WebAuthnWalletComponent } from './WebAuthnWalletComponent';

export const CommunicationBar: React.FC = () => {
  const { showChat, setShowChat } = useAppStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gray-900 border-t border-gray-700 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - Chat Button and Wallet */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
              showChat
                ? 'bg-green-900/40 text-green-300 border border-green-700/50'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-gray-600/50'
            }`}
            title="Toggle AI Chat"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
            {showChat && (
              <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </button>

          {/* Wallet Component */}
          <div className="bg-gray-800/50 rounded-lg p-1">
            <WebAuthnWalletComponent />
          </div>
        </div>
      </div>
    </div>
  );
};