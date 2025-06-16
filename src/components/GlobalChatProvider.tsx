'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ChatPanel, ChatMessage, ChatDockPosition } from './ChatPanel';
import { ChatPopout, useChatPopout } from './ChatPopout';
import { useAppStore } from '../store/app-store';
import { useContextManager } from '../hooks/useContextManager';
import { StructuredToolParser } from '../tools/parser';
import { ToolHandlers } from '../tools/handlers';

interface GlobalChatContextType {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  chatPanelOpen: boolean;
  setChatPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatDockPosition: ChatDockPosition;
  setChatDockPosition: React.Dispatch<React.SetStateAction<ChatDockPosition>>;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}

const GlobalChatContext = createContext<GlobalChatContextType | null>(null);

export const useGlobalChat = () => {
  const context = useContext(GlobalChatContext);
  if (!context) {
    throw new Error('useGlobalChat must be used within a GlobalChatProvider');
  }
  return context;
};

export const GlobalChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentContext } = useAppStore();
  const contextManager = useContextManager();
  const { isPopoutOpen, openPopout, closePopout } = useChatPopout();
  
  // Initialize tool services
  const [toolParser] = useState(() => new StructuredToolParser());
  const [toolHandlers] = useState(() => new ToolHandlers());

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to InfraSim! I\'m your context-aware AI assistant. I can help you create, modify, and explore infrastructure models using natural language. I automatically adapt to what you\'re working on - try switching between different modes in the chat panel!\n\n• 🏗️ Infrastructure Mode: "Add a load balancer", "Connect web to database"\n• 🏢 Company Mode: "Create a tech company called TechCorp"\n• 🔌 API Mode: "Generate REST API for payments"\n• ⚙️ Simulation Mode: "Start simulation", "Check status"',
      timestamp: new Date(),
      context: currentContext
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [chatDockPosition, setChatDockPosition] = useState<ChatDockPosition>('side');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
      context: currentContext
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsProcessing(true);

    try {
      const parseResult = await toolParser.parseInput(chatInput.trim());

      if (parseResult.success) {
        if (parseResult.action.action === 'chat') {
          // Handle chat messages
          const { parameters } = parseResult.action;
          const allMessages = [...chatMessages, userMessage];
          const messagesWithRoles = allMessages.map(msg => ({
            id: msg.id,
            role: msg.type as 'user' | 'assistant' | 'system',
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            context: msg.context
          }));

          parseResult.action.parameters.messages = messagesWithRoles;
          parseResult.action.parameters.context = {
            appContext: currentContext,
            contextMode: currentContext.mode
          };
        }

        const executionResult = await toolHandlers.executeAction(parseResult.action, currentContext);

        if (executionResult.success) {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: executionResult.message,
            timestamp: new Date(),
            data: executionResult.data,
            context: currentContext
          };
          setChatMessages(prev => [...prev, assistantMessage]);
        } else {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `Error: ${executionResult.error || executionResult.message}`,
            timestamp: new Date(),
            context: currentContext
          };
          setChatMessages(prev => [...prev, errorMessage]);
        }
      } else {
        const fallbackMessage = `I couldn't understand that request. Please try rephrasing or ask for help with available commands.`;
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fallbackMessage,
          timestamp: new Date(),
          context: currentContext
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error processing chat:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        context: currentContext
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChatPopOut = () => {
    setChatPanelOpen(false);
    openPopout();
  };

  const handlePopoutClose = () => {
    closePopout();
    setChatPanelOpen(true);
  };

  const handleDockPositionChange = (position: ChatDockPosition) => {
    setChatDockPosition(position);
    if (position === 'floating') {
      setChatPanelOpen(true);
    }
  };

  const contextValue: GlobalChatContextType = {
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    chatPanelOpen,
    setChatPanelOpen,
    chatDockPosition,
    setChatDockPosition,
    isProcessing,
    setIsProcessing
  };

  return (
    <GlobalChatContext.Provider value={contextValue}>
      {children}
      
      {/* Global Chat Panel */}
      {chatPanelOpen && !isPopoutOpen && (
        <div className="fixed top-16 right-0 bottom-0 z-[9995]">
          <ChatPanel
            messages={chatMessages}
            input={chatInput}
            onInputChange={setChatInput}
            onSubmit={handleChatSubmit}
            isProcessing={isProcessing}
            dockPosition={chatDockPosition}
            onDockPositionChange={handleDockPositionChange}
            onPopOut={handleChatPopOut}
            onClose={() => setChatPanelOpen(false)}
          />
        </div>
      )}
      
      {/* Chat Popout */}
      {isPopoutOpen && (
        <ChatPopout
          messages={chatMessages}
          input={chatInput}
          onInputChange={setChatInput}
          onSubmit={handleChatSubmit}
          isProcessing={isProcessing}
          onClose={handlePopoutClose}
        />
      )}
    </GlobalChatContext.Provider>
  );
};