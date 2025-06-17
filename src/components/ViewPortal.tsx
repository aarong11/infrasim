'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app-store';

interface ViewPortalProps {
  initialPath?: string;
}

export const ViewPortal: React.FC<ViewPortalProps> = ({ initialPath = '/' }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [isInitialized, setIsInitialized] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const { showChat } = useAppStore();

  useEffect(() => {
    // Get the base URL for absolute iframe URLs
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }

    // Initialize with current path
    const path = window.location.pathname;
    setCurrentPath(path);
    setIsInitialized(true);

    // Handle custom navigation events for iframe navigation
    const handleIframeNavigation = (event: CustomEvent) => {
      const newPath = event.detail.path;
      setCurrentPath(newPath);
      
      // Update browser URL without full page reload
      window.history.pushState({ path: newPath }, '', newPath);
    };

    // Handle messages from iframes
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'IFRAME_NAVIGATE') {
        navigateToIframe(event.data.path);
      }
    };

    // Handle browser back/forward buttons
    const handlePopState = (event: PopStateEvent) => {
      const path = window.location.pathname;
      setCurrentPath(path);
    };

    window.addEventListener('iframe-navigate', handleIframeNavigation as EventListener);
    window.addEventListener('message', handleMessage);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('iframe-navigate', handleIframeNavigation as EventListener);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Function to navigate via iframe
  const navigateToIframe = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({ path }, '', path);
  };

  // Make navigation function available globally
  useEffect(() => {
    (window as any).navigateToIframe = navigateToIframe;
  }, []);

  // Create absolute URL for iframe
  const getIframeUrl = (path: string) => {
    if (!baseUrl) return 'about:blank';
    
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Create absolute URL with iframe parameter
    const url = new URL(normalizedPath, baseUrl);
    url.searchParams.set('iframe', 'true');
    
    return url.toString();
  };

  if (!isInitialized || !baseUrl) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const iframeUrl = getIframeUrl(currentPath);

  // Calculate dynamic styles based on chat state
  const getPortalStyles = () => {
    if (showChat) {
      // When chat is open, shift content to the right and reduce width
      return {
        marginLeft: '500px', // Width of chat panel
        width: 'calc(100% - 500px)'
      };
    }
    
    return {
      marginLeft: '0',
      width: '100%'
    };
  };

  return (
    <div 
      className="w-full h-full transition-all duration-300 ease-in-out"
      style={getPortalStyles()}
    >
      <iframe
        key={currentPath}
        src={iframeUrl}
        className="w-full h-full border-0"
        title="View Portal Content"
        onLoad={(e) => {
          const iframe = e.target as HTMLIFrameElement;
          
          // Check if iframe loaded successfully
          if (iframe?.contentWindow) {
            try {
              // Only inject if not about:blank
              if (!iframe.src.includes('about:blank')) {
                iframe.contentWindow.postMessage({
                  type: 'IFRAME_MODE',
                  navigateToIframe: true
                }, '*');
              }
            } catch (e) {
              // Handle cross-origin restrictions
              console.log('Cannot inject into iframe due to cross-origin restrictions');
            }
          }
        }}
        onError={(e) => {
          console.error('Iframe failed to load:', e);
        }}
      />
    </div>
  );
};