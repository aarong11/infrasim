'use client';

import React from 'react';

// Check if we're running inside an iframe
export function isIframeMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('iframe') === 'true') {
      return true;
    }
    
    // Check if we're in an iframe
    return window.self !== window.top;
  } catch (e) {
    // If we can't access window.top due to cross-origin restrictions, we're likely in an iframe
    return true;
  }
}

// Navigate within the iframe system
export function navigateToIframe(path: string, options: { newTab?: boolean; newWindow?: boolean } = {}) {
  if (typeof window === 'undefined') return;
  
  // Handle new tab/window requests
  if (options.newTab) {
    window.open(path, '_blank');
    return;
  }
  
  if (options.newWindow) {
    window.open(path, '_blank', 'width=800,height=600');
    return;
  }
  
  // Always trigger the iframe navigation event for the parent window
  const event = new CustomEvent('iframe-navigate', {
    detail: { path }
  });
  window.dispatchEvent(event);
}

// Chat control functions for iframe communication
export function toggleChat() {
  if (typeof window === 'undefined') return;
  
  if (isIframeMode()) {
    // Send message to parent to toggle chat
    try {
      window.parent.postMessage({
        type: 'TOGGLE_CHAT'
      }, '*');
    } catch (e) {
      console.warn('Could not send toggle chat message to parent');
    }
  } else {
    // We're in the parent, use the store directly
    const { useAppStore } = require('../store/app-store');
    const { showChat, setShowChat } = useAppStore.getState();
    setShowChat(!showChat);
  }
}

export function showChat() {
  if (typeof window === 'undefined') return;
  
  if (isIframeMode()) {
    try {
      window.parent.postMessage({
        type: 'SHOW_CHAT'
      }, '*');
    } catch (e) {
      console.warn('Could not send show chat message to parent');
    }
  } else {
    const { useAppStore } = require('../store/app-store');
    const { setShowChat } = useAppStore.getState();
    setShowChat(true);
  }
}

export function hideChat() {
  if (typeof window === 'undefined') return;
  
  if (isIframeMode()) {
    try {
      window.parent.postMessage({
        type: 'HIDE_CHAT'
      }, '*');
    } catch (e) {
      console.warn('Could not send hide chat message to parent');
    }
  } else {
    const { useAppStore } = require('../store/app-store');
    const { setShowChat } = useAppStore.getState();
    setShowChat(false);
  }
}

// React component for iframe-aware links
interface IframeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  newTab?: boolean;
  newWindow?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const IframeLink: React.FC<IframeLinkProps> = ({
  href,
  children,
  className = '',
  title,
  newTab = false,
  newWindow = false,
  onClick
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (onClick) {
      onClick(e);
    }
    
    navigateToIframe(href, { newTab, newWindow });
  };

  return (
    <a
      href={href}
      className={className}
      title={title}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

// React component for chat control button (for use inside iframes)
interface ChatControlButtonProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}

export const ChatControlButton: React.FC<ChatControlButtonProps> = ({
  children,
  className = '',
  title = 'Toggle Chat',
  onClick
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    toggleChat();
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
};

// Hook for iframe navigation
export function useIframeNavigation() {
  const navigate = (path: string, options?: { newTab?: boolean; newWindow?: boolean }) => {
    navigateToIframe(path, options);
  };

  return {
    navigate,
    isIframe: isIframeMode(),
    toggleChat,
    showChat,
    hideChat
  };
}