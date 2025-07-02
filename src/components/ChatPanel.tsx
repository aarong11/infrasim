'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, AppContext } from '@store/app-store';
import { useContextManager } from '@hooks/useContextManager';
import { PluginModal } from './PluginModal';
import { ToolExecutionMetadata } from '@core/enhanced-langchain-agent';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any;
  context?: AppContext;
}

export type ChatDockPosition = 'side' | 'bottom' | 'floating';

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  dockPosition?: ChatDockPosition;
  onDockPositionChange?: (position: ChatDockPosition) => void;
  onPopOut?: () => void;
  onClose?: () => void;
  isPopout?: boolean;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  input,
  onInputChange,
  onSubmit,
  isProcessing,
  dockPosition = 'side',
  onDockPositionChange,
  onPopOut,
  onClose,
  isPopout = false,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [showContextSwitcher, setShowContextSwitcher] = useState(false);
  const [showPluginModal, setShowPluginModal] = useState(false);
  
  // Context management
  const contextManager = useContextManager();
  const { 
    currentContext, 
    isAgentActive, 
    activeAgentTask,
    toolCalls,
    agentWorkflow 
  } = useAppStore();

  // Ensure we only render timestamps on the client to avoid hydration errors
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getContainerClasses = () => {
    const baseClasses = "bg-gray-900 border-gray-700 flex flex-col";
    
    if (isPopout) {
      return `${baseClasses} h-full w-full`;
    }
    
    switch (dockPosition) {
      case 'side':
        return `${baseClasses} w-96 border-l h-full`;
      case 'bottom':
        return `${baseClasses} h-80 border-t w-full`;
      case 'floating':
        return `${baseClasses} w-96 h-96 rounded-lg border shadow-2xl absolute bottom-4 right-4 z-50`;
      default:
        return `${baseClasses} w-96 border-l h-full`;
    }
  };

  const getContextModeIcon = (mode: AppContext['mode']) => {
    switch (mode) {
      case 'infrastructure_management': return '🏗️';
      case 'company_management': return '🏢';
      case 'api_management': return '🔌';
      case 'simulation_control': return '⚙️';
      case 'general_assistance': default: return '💬';
    }
  };

  const getContextModeColor = (mode: AppContext['mode']) => {
    switch (mode) {
      case 'infrastructure_management': return 'text-blue-400 bg-blue-900/20';
      case 'company_management': return 'text-green-400 bg-green-900/20';
      case 'api_management': return 'text-purple-400 bg-purple-900/20';
      case 'simulation_control': return 'text-orange-400 bg-orange-900/20';
      case 'general_assistance': default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const handleContextSwitch = (mode: AppContext['mode']) => {
    switch (mode) {
      case 'general_assistance':
        contextManager.switchToGeneralAssistance();
        break;
      case 'infrastructure_management':
        contextManager.switchToInfrastructureManagement();
        break;
      case 'company_management':
        contextManager.switchToCompanyManagement();
        break;
      case 'api_management':
        contextManager.switchToApiManagement();
        break;
      case 'simulation_control':
        contextManager.switchToSimulationControl();
        break;
    }
    setShowContextSwitcher(false);
  };

  const contextModes: { mode: AppContext['mode']; label: string; description: string }[] = [
    { mode: 'general_assistance', label: 'General Help', description: 'General questions and guidance' },
    { mode: 'infrastructure_management', label: 'Infrastructure', description: 'Manage servers, networks, and components' },
    { mode: 'company_management', label: 'Companies', description: 'Create and manage company profiles' },
    { mode: 'api_management', label: 'APIs', description: 'Design and manage API services' },
    { mode: 'simulation_control', label: 'Simulation', description: 'Control simulation operations' }
  ];

  const recentToolCalls = toolCalls.slice(0, 3);
  const recentWorkflowSteps = agentWorkflow.slice(0, 2);

  // Convert ToolCall objects to ToolExecutionMetadata format for the plugin modal
  const convertToolCallsToExecutionMetadata = (toolCalls: any[]): ToolExecutionMetadata[] => {
    return toolCalls.map(call => ({
      toolName: call.toolName,
      timestamp: call.timestamp,
      parameters: call.parameters,
      result: call.result,
      success: call.status === 'success',
      duration: call.duration || 0,
      environment: 'server', // Default environment since ToolCall doesn't have this field
      logs: [], // ToolCall doesn't have logs, so provide empty array
      error: call.error
    }));
  };

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      {/* Enhanced Chat Header with Context Awareness */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <span className="text-xl">🤖</span>
            <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
            {isAgentActive && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">Active</span>
              </div>
            )}
          </div>
          
          {!isPopout && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Context Mode Display */}
        <div className="relative">
          <button
            onClick={() => setShowContextSwitcher(!showContextSwitcher)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${getContextModeColor(currentContext.mode)} hover:opacity-80`}
          >
            <span>{getContextModeIcon(currentContext.mode)}</span>
            <span className="text-sm font-medium">
              {contextModes.find(m => m.mode === currentContext.mode)?.label || 'General'}
            </span>
            <span className="text-xs">▼</span>
          </button>

          {/* Context Switcher Dropdown */}
          {showContextSwitcher && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-64">
              {contextModes.map((modeOption) => (
                <button
                  key={modeOption.mode}
                  onClick={() => handleContextSwitch(modeOption.mode)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors ${
                    currentContext.mode === modeOption.mode ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{getContextModeIcon(modeOption.mode)}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{modeOption.label}</div>
                      <div className="text-xs text-gray-400">{modeOption.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Context Info */}
        {(currentContext.currentCompanyId || currentContext.currentEntityId) && (
          <div className="mt-2 text-xs text-gray-400">
            {currentContext.currentCompanyId && (
              <div>Company: {currentContext.currentCompanyId}</div>
            )}
            {currentContext.currentEntityId && (
              <div>Entity: {currentContext.currentEntityId}</div>
            )}
          </div>
        )}

        {/* Active Agent Task */}
        {activeAgentTask && (
          <div className="mt-2 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
            Task: {activeAgentTask}
          </div>
        )}
      </div>

      {/* Recent Tool Activity (Mini Display) */}
      {(recentToolCalls.length > 0 || recentWorkflowSteps.length > 0) && !isProcessing && (
        <div className="bg-gray-800/50 border-b border-gray-700 p-2">
          <div className="text-xs text-gray-400 mb-1">Recent Activity:</div>
          <div className="space-y-1">
            {recentWorkflowSteps.map((step) => (
              <div key={step.id} className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">{step.stepType === 'tool_call' ? '🔧' : '📝'}</span>
                <span className="text-gray-300 truncate">{step.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${message.type === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                message.type === 'user'
                  ? 'bg-cyan-600 text-white'
                  : message.type === 'system'
                  ? 'bg-gray-700 text-gray-300 border border-gray-600'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              {message.content}
              
              {/* Context indicator */}
              {message.context && (
                <div className="mt-1 text-xs opacity-70">
                  {getContextModeIcon(message.context.mode)} {message.context.mode.replace('_', ' ')}
                </div>
              )}
              
              {/* Data details */}
              {message.data && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-gray-400">View data</summary>
                  <pre className="mt-1 text-gray-400 overflow-x-auto">
                    {JSON.stringify(message.data, null, 2)}
                  </pre>
                </details>
              )}
              
              {/* Timestamp */}
              {isClient && (
                <div className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString('en-US', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
                <span>Processing...</span>
                {activeAgentTask && (
                  <span className="text-gray-400">({activeAgentTask})</span>
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-700 p-4">
        <form onSubmit={onSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={`Ask about ${currentContext.mode.replace('_', ' ')}...`}
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={() => setShowPluginModal(true)}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm transition-colors"
            title="Open Plugin Manager"
          >
            🔌
          </button>
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:text-gray-400 px-4 py-2 rounded text-sm transition-colors"
          >
            Send
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-400">
          <div className="flex items-center justify-between">
            <span>
              {currentContext.mode === 'infrastructure_management' && 'Try: "Add a load balancer", "Connect web to database"'}
              {currentContext.mode === 'company_management' && 'Try: "Create a tech company", "Add payment processing"'}
              {currentContext.mode === 'api_management' && 'Try: "Create REST API", "Add authentication"'}
              {currentContext.mode === 'simulation_control' && 'Try: "Start simulation", "Check status"'}
              {currentContext.mode === 'general_assistance' && 'Try: "Create a bank", "Add load balancer", "Connect web to db"'}
            </span>
            
            <div className="flex items-center space-x-2">
              {(toolCalls.length > 0 || agentWorkflow.length > 0) && (
                <button
                  onClick={() => useAppStore.getState().setShowToolCallLog(true)}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  View Activity ({toolCalls.length + agentWorkflow.length})
                </button>
              )}
              <button
                onClick={() => setShowPluginModal(true)}
                className="text-purple-400 hover:text-purple-300 text-xs"
              >
                Plugins
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plugin Modal */}
      <PluginModal 
        isOpen={showPluginModal}
        onClose={() => setShowPluginModal(false)}
        recentExecutions={convertToolCallsToExecutionMetadata(toolCalls)}
      />
    </div>
  );
};