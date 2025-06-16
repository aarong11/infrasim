'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, ToolCall, AgentWorkflowStep } from '../store/app-store';
import { Copy, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AgentActivityPanelProps {
  className?: string;
}

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({ className = '' }) => {
  const { 
    toolCalls, 
    agentWorkflow, 
    isAgentActive, 
    activeAgentTask,
    showToolCallLog,
    setShowToolCallLog,
    clearToolCalls,
    clearWorkflow
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'workflow' | 'tools'>('workflow');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [toolCalls, agentWorkflow]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: ToolCall['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepTypeIcon = (stepType: AgentWorkflowStep['stepType']) => {
    switch (stepType) {
      case 'tool_call':
        return '🔧';
      case 'decision':
        return '🤔';
      case 'context_switch':
        return '🔄';
      case 'user_interaction':
        return '👤';
      default:
        return '📝';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    return `${duration}ms`;
  };

  const renderToolCall = (toolCall: ToolCall) => {
    const isExpanded = expandedItems.has(toolCall.id);
    
    return (
      <div key={toolCall.id} className="bg-gray-800 rounded-lg border border-gray-700 mb-2">
        <div 
          className="p-3 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => toggleExpanded(toolCall.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(toolCall.status)}
              <div className="flex items-center space-x-2">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-medium text-white">{toolCall.toolName}</span>
              </div>
              <span className="text-sm text-gray-400">
                {toolCall.context.mode.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span>{formatDuration(toolCall.duration)}</span>
              <span>{toolCall.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-gray-700">
            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-300">Parameters</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(JSON.stringify(toolCall.parameters, null, 2));
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <pre className="text-xs bg-gray-900 p-2 rounded border overflow-x-auto">
                {JSON.stringify(toolCall.parameters, null, 2)}
              </pre>
            </div>

            {/* Result */}
            {toolCall.result && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-300">Result</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(JSON.stringify(toolCall.result, null, 2));
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <pre className="text-xs bg-gray-900 p-2 rounded border overflow-x-auto text-green-300">
                  {JSON.stringify(toolCall.result, null, 2)}
                </pre>
              </div>
            )}

            {/* Error */}
            {toolCall.error && (
              <div>
                <span className="text-sm font-medium text-red-300">Error</span>
                <pre className="text-xs bg-red-900/20 p-2 rounded border border-red-700 text-red-300">
                  {toolCall.error}
                </pre>
              </div>
            )}

            {/* Context */}
            <div>
              <span className="text-sm font-medium text-gray-300">Context</span>
              <div className="text-xs bg-gray-900 p-2 rounded border">
                <div className="text-cyan-300">Mode: {toolCall.context.mode}</div>
                {toolCall.context.currentCompanyId && (
                  <div className="text-blue-300">Company: {toolCall.context.currentCompanyId}</div>
                )}
                {toolCall.context.currentEntityId && (
                  <div className="text-green-300">Entity: {toolCall.context.currentEntityId}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkflowStep = (step: AgentWorkflowStep) => {
    const isExpanded = expandedItems.has(step.id);
    
    return (
      <div key={step.id} className="bg-gray-800 rounded-lg border border-gray-700 mb-2">
        <div 
          className="p-3 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => toggleExpanded(step.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getStepTypeIcon(step.stepType)}</span>
              <div className="flex items-center space-x-2">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-medium text-white">{step.stepType.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-300 mt-1">{step.description}</p>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-gray-700">
            {/* Tool Call Details */}
            {step.toolCall && (
              <div>
                <span className="text-sm font-medium text-gray-300">Tool Call</span>
                <div className="text-xs bg-gray-900 p-2 rounded border">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(step.toolCall.status)}
                    <span className="text-white">{step.toolCall.toolName}</span>
                    <span className="text-gray-400">({formatDuration(step.toolCall.duration)})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Data */}
            {step.data && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-300">Data</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(JSON.stringify(step.data, null, 2));
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <pre className="text-xs bg-gray-900 p-2 rounded border overflow-x-auto">
                  {JSON.stringify(step.data, null, 2)}
                </pre>
              </div>
            )}

            {/* Context */}
            <div>
              <span className="text-sm font-medium text-gray-300">Context</span>
              <div className="text-xs bg-gray-900 p-2 rounded border">
                <div className="text-cyan-300">Mode: {step.context.mode}</div>
                {step.context.currentCompanyId && (
                  <div className="text-blue-300">Company: {step.context.currentCompanyId}</div>
                )}
                {step.context.currentEntityId && (
                  <div className="text-green-300">Entity: {step.context.currentEntityId}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!showToolCallLog) {
    return (
      <button
        onClick={() => setShowToolCallLog(true)}
        className="fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2"
      >
        <span>🤖</span>
        <span>Agent Activity</span>
        {isAgentActive && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
      </button>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg shadow-2xl ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 rounded-t-lg border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">🤖</span>
            <h3 className="text-lg font-semibold text-white">Agent Activity</h3>
            {isAgentActive && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-green-400">Active</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowToolCallLog(false)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
        
        {activeAgentTask && (
          <p className="text-sm text-gray-300 mt-1">Task: {activeAgentTask}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              activeTab === 'workflow'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Workflow ({agentWorkflow.length})
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              activeTab === 'tools'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tool Calls ({toolCalls.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'workflow' && (
          <div className="space-y-2">
            {agentWorkflow.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No workflow steps yet. Start a conversation to see agent activity.
              </div>
            ) : (
              agentWorkflow.map(renderWorkflowStep)
            )}
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-2">
            {toolCalls.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No tool calls yet. Agent tools will appear here when used.
              </div>
            ) : (
              toolCalls.map(renderToolCall)
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-2 rounded-b-lg border-t border-gray-700">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-400">
            {activeTab === 'workflow' ? agentWorkflow.length : toolCalls.length} items
          </div>
          <div className="flex space-x-2">
            {activeTab === 'workflow' ? (
              <button
                onClick={clearWorkflow}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear Workflow
              </button>
            ) : (
              <button
                onClick={clearToolCalls}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear Tool Calls
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};