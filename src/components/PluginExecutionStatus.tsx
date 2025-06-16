// Enhanced Plugin Execution Status Component with LangChain Integration
'use client';

import React, { useState } from 'react';
import { ToolExecutionMetadata } from '../core/enhanced-langchain-agent';

interface PluginExecutionDisplayProps {
  executions: ToolExecutionMetadata[];
  isStreaming?: boolean;
}

export const PluginExecutionStatus: React.FC<PluginExecutionDisplayProps> = ({ 
  executions, 
  isStreaming = false 
}) => {
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');

  const filteredExecutions = executions.filter(exec => {
    if (filter === 'success') return exec.success;
    if (filter === 'error') return !exec.success;
    return true;
  });

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment.toLowerCase()) {
      case 'server':
        return 'bg-blue-100 text-blue-800';
      case 'browser':
        return 'bg-green-100 text-green-800';
      case 'container':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Plugin Execution Status
          {isStreaming && <span className="ml-2 text-blue-500 animate-pulse">🔄</span>}
        </h3>
        
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All ({executions.length})</option>
            <option value="success">Success ({executions.filter(e => e.success).length})</option>
            <option value="error">Errors ({executions.filter(e => !e.success).length})</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredExecutions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔌</div>
            <p>No plugin executions to display</p>
          </div>
        ) : (
          filteredExecutions.map((execution, index) => (
            <div
              key={`${execution.toolName}-${execution.timestamp.getTime()}`}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(execution.success)}</span>
                  <div>
                    <div className="font-medium text-gray-900">{execution.toolName}</div>
                    <div className="text-sm text-gray-500">
                      {execution.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnvironmentColor(execution.environment)}`}>
                    {execution.environment}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDuration(execution.duration)}
                  </span>
                  <button
                    onClick={() => setExpandedExecution(
                      expandedExecution === execution.toolName ? null : execution.toolName
                    )}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {expandedExecution === execution.toolName ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {execution.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <strong>Error:</strong> {execution.error}
                </div>
              )}

              {expandedExecution === execution.toolName && (
                <div className="mt-3 space-y-3">
                  {/* Parameters */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Parameters</h4>
                    <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(execution.parameters, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Result */}
                  {execution.result && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Result</h4>
                      <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                        <pre className="whitespace-pre-wrap">
                          {typeof execution.result === 'string' 
                            ? execution.result 
                            : JSON.stringify(execution.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Logs */}
                  {execution.logs && execution.logs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Logs</h4>
                      <div className="bg-gray-900 text-green-400 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
                        {execution.logs.map((log, logIndex) => (
                          <div key={logIndex}>{log}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {executions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {executions.filter(e => e.success).length}
              </div>
              <div className="text-xs text-gray-500">Successful</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">
                {executions.filter(e => !e.success).length}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {formatDuration(
                  executions.reduce((sum, e) => sum + e.duration, 0) / executions.length
                )}
              </div>
              <div className="text-xs text-gray-500">Avg Duration</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Plugin Registry Display Component
export const PluginRegistryDisplay: React.FC<{
  plugins: Array<{
    name: string;
    description: string;
    environment?: string;
  }>;
  onExecutePlugin?: (pluginName: string) => void;
}> = ({ plugins, onExecutePlugin }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnv = environmentFilter === 'all' || plugin.environment === environmentFilter;
    return matchesSearch && matchesEnv;
  });

  const environments = Array.from(new Set(plugins.map(p => p.environment).filter(Boolean)));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Plugin Registry</h3>
        <span className="text-sm text-gray-500">{plugins.length} plugins</span>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-4">
        <input
          type="text"
          placeholder="Search plugins..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <select
          value={environmentFilter}
          onChange={(e) => setEnvironmentFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">All Environments</option>
          {environments.map(env => (
            <option key={env} value={env}>{env}</option>
          ))}
        </select>
      </div>

      {/* Plugin List */}
      <div className="space-y-2">
        {filteredPlugins.map((plugin, index) => (
          <div
            key={`${plugin.name}-${index}`}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="font-medium text-gray-900">{plugin.name}</div>
              <div className="text-sm text-gray-500">{plugin.description}</div>
            </div>
            
            <div className="flex items-center space-x-2">
              {plugin.environment && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnvironmentColor(plugin.environment)}`}>
                  {plugin.environment}
                </span>
              )}
              {onExecutePlugin && (
                <button
                  onClick={() => onExecutePlugin(plugin.name)}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Execute
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🔍</div>
          <p>No plugins match your search criteria</p>
        </div>
      )}
    </div>
  );
};

// Helper function for environment colors (shared between components)
function getEnvironmentColor(environment: string) {
  switch (environment.toLowerCase()) {
    case 'server':
      return 'bg-blue-100 text-blue-800';
    case 'browser':
      return 'bg-green-100 text-green-800';
    case 'container':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}