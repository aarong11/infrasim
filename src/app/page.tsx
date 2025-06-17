'use client';

import React, { useState, useEffect } from 'react';
import { isIframeMode } from '../utils/iframe-navigation';
import { CompanyGrid } from '../components/CompanyGrid';

export default function HomePage() {
  const [inIframe, setInIframe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setInIframe(isIframeMode());
    setIsLoading(false);
  }, []);

  // Show loading state while determining iframe mode
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="w-full px-2 py-2">
        {/* Make content use almost full width with minimal margins */}
        <div className="w-full">
          {/* Companies content box with minimal padding */}
          <div className="bg-gray-800 rounded-lg p-4">
            <CompanyGrid />
          </div>
        </div>
      </div>
    </div>
  );
}
