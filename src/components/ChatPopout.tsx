'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatPanel, ChatMessage } from './ChatPanel';

interface ChatPopoutProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  onClose: () => void;
}

export const ChatPopout: React.FC<ChatPopoutProps> = ({
  messages,
  input,
  onInputChange,
  onSubmit,
  isProcessing,
  onClose
}) => {
  const windowRef = useRef<Window | null>(null);
  const rootRef = useRef<any>(null);

  useEffect(() => {
    // Create new window
    const newWindow = window.open(
      '',
      'chat-popout',
      'width=500,height=700,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!newWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site.');
      onClose();
      return;
    }

    windowRef.current = newWindow;

    // Set up the new window's document
    newWindow.document.title = 'AI Assistant - Infrastructure Chat';
    
    // Copy styles from parent window
    const parentStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
    parentStyles.forEach(style => {
      const clonedStyle = style.cloneNode(true);
      newWindow.document.head.appendChild(clonedStyle);
    });

    // Add Tailwind CSS if not already present
    if (!parentStyles.some(style => style.textContent?.includes('tailwind') || 
                           (style as HTMLLinkElement).href?.includes('tailwind'))) {
      const tailwindLink = newWindow.document.createElement('link');
      tailwindLink.rel = 'stylesheet';
      tailwindLink.href = 'https://cdn.tailwindcss.com';
      newWindow.document.head.appendChild(tailwindLink);
    }

    // Set up body styles
    newWindow.document.body.style.margin = '0';
    newWindow.document.body.style.padding = '0';
    newWindow.document.body.style.backgroundColor = '#111827'; // gray-900
    newWindow.document.body.style.color = '#ffffff';
    newWindow.document.body.style.fontFamily = 'system-ui, sans-serif';

    // Create container div
    const container = newWindow.document.createElement('div');
    container.id = 'chat-popout-root';
    container.style.width = '100vw';
    container.style.height = '100vh';
    newWindow.document.body.appendChild(container);

    // Create React root and render
    rootRef.current = createRoot(container);

    // Handle window close
    const handleWindowClose = () => {
      onClose();
    };

    newWindow.addEventListener('beforeunload', handleWindowClose);

    // Cleanup function
    return () => {
      if (windowRef.current && !windowRef.current.closed) {
        windowRef.current.removeEventListener('beforeunload', handleWindowClose);
        windowRef.current.close();
      }
      if (rootRef.current) {
        rootRef.current.unmount();
      }
    };
  }, [onClose]);

  // Render chat panel in the pop-out window
  useEffect(() => {
    if (rootRef.current && windowRef.current && !windowRef.current.closed) {
      rootRef.current.render(
        <ChatPanel
          messages={messages}
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          isProcessing={isProcessing}
          onClose={onClose}
          isPopout={true}
        />
      );
    }
  }, [messages, input, onInputChange, onSubmit, isProcessing, onClose]);

  // This component doesn't render anything in the parent window
  return null;
};

// Hook to manage pop-out state
export const useChatPopout = () => {
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);

  const openPopout = () => setIsPopoutOpen(true);
  const closePopout = () => setIsPopoutOpen(false);

  return {
    isPopoutOpen,
    openPopout,
    closePopout
  };
};