'use client';

import React from 'react';
import { CompanyGrid } from '../../components/CompanyGrid';
import { ChatControlButton } from '../../utils/iframe-navigation';
import { MessageCircle } from 'lucide-react';

export default function ContentPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="w-full px-2 py-2">
        {/* Make content use almost full width with minimal margins */}
        <div className="w-full">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">Companies</h1>
              <p className="text-xl text-gray-300">
                Browse and manage simulated company infrastructures
              </p>
            </div>
            
            {/* Chat control button for iframe mode */}
            <ChatControlButton
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Toggle AI Chat"
            >
              <MessageCircle className="w-5 h-5" />
              AI Chat
            </ChatControlButton>
          </div>

          {/* Companies content box with minimal padding */}
          <div className="bg-gray-800 rounded-lg p-4">
            <CompanyGrid />
          </div>
        </div>
      </div>
    </div>
  );
}