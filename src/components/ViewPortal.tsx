'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@store/app-store';

interface ViewPortalProps {
  initialPath?: string;
}

export const ViewPortal: React.FC<ViewPortalProps> = ({ initialPath = '/' }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [isInitialized, setIsInitialized] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const { showChat, showWallet } = useAppStore();

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

  // Calculate dynamic styles based on chat and wallet state
  const getPortalStyles = () => {
    let marginLeft = '0';
    let width = '100%';
    
    // Since only one can be open at a time, we just need to check if either is open
    if (showChat || showWallet) {
      // Either chat or wallet is open - shift right by 500px since both are on the left
      marginLeft = '500px';
      width = 'calc(100% - 500px)';
    }
    
    return {
      marginLeft,
      width
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
        name="viewportal-iframe"
        id="viewportal-iframe"
        allowFullScreen
        allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; payment; picture-in-picture; publickey-credentials-get; screen-wake-lock; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        frameBorder="0"
        marginHeight={0}
        marginWidth={0}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation allow-downloads allow-modals allow-pointer-lock allow-orientation-lock allow-storage-access-by-user-activation"
        style={{
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          pointerEvents: 'auto',
          scrollbarWidth: 'auto'
        }}
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