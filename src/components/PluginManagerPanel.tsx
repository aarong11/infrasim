'use client';

import React, { useState, useEffect } from 'react';
import { getPluginManager } from '../core/plugin-manager';
import { 
  PluginDefinition, 
  PluginExecutionContext, 
  ExecutionEnvironment,
  PluginExecutionStatus 
} from '../core/plugin-system';

interface PluginManagerPanelProps {
  onClose: () => void;
}

export function PluginManagerPanel({ onClose }: PluginManagerPanelProps) {
  const [plugins, setPlugins] = useState<PluginDefinition[]>([]);
  const [activeExecutions, setActiveExecutions] = useState<PluginExecutionContext[]>([]);
  const [executionHistory, setExecutionHistory] = useState<PluginExecutionContext[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<'plugins' | 'executions' | 'history' | 'create'>('plugins');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plugin creation form state
  const [newPlugin, setNewPlugin] = useState({
    name: '',
    description: '',
    environment: ExecutionEnvironment.SERVER,
    code: '',
    parameters: {}
  });

  const pluginManager = getPluginManager();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [pluginList, active, history] = await Promise.all([
        pluginManager.getAvailablePlugins(),
        pluginManager.getActiveExecutions(),
        pluginManager.getExecutionHistory(20)
      ]);
      
      setPlugins(pluginList);
      setActiveExecutions(active);
      setExecutionHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugin data');
    }
  };

  const handleExecutePlugin = async (plugin: PluginDefinition) => {
    try {
      setLoading(true);
      
      // Simple parameter collection (in a real UI, this would be a proper form)
      const parameters: Record<string, any> = {};
      for (const [key, paramDef] of Object.entries(plugin.parameters)) {
        if (paramDef.required) {
          const value = prompt(`Enter value for ${key} (${paramDef.description || 'No description'})`);
          if (value !== null) {
            parameters[key] = value;
          }
        }
      }

      await pluginManager.executePlugin({
        pluginName: plugin.pluginName,
        parameters
      });

      await loadData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute plugin');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlugin = async () => {
    try {
      setLoading(true);
      
      const plugin: PluginDefinition = {
        pluginName: newPlugin.name,
        version: '1.0.0',
        description: newPlugin.description,
        executionContext: newPlugin.environment,
        parameters: newPlugin.parameters,
        inlineCode: newPlugin.code,
        dependencies: [],
        timeout: 30000,
        retries: 0,
        metadata: {
          createdBy: 'user',
          createdAt: new Date().toISOString()
        }
      };

      await pluginManager.registerPlugin(plugin);
      
      // Reset form
      setNewPlugin({
        name: '',
        description: '',
        environment: ExecutionEnvironment.SERVER,
        code: '',
        parameters: {}
      });
      
      setActiveTab('plugins');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plugin');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelExecution = async (requestId: string) => {
    try {
      await pluginManager.cancelExecution(requestId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel execution');
    }
  };

  const getStatusColor = (status: PluginExecutionStatus) => {
    switch (status) {
      case PluginExecutionStatus.PENDING: return 'text-yellow-600';
      case PluginExecutionStatus.RUNNING: return 'text-blue-600';
      case PluginExecutionStatus.COMPLETED: return 'text-green-600';
      case PluginExecutionStatus.ERROR: return 'text-red-600';
      case PluginExecutionStatus.CANCELLED: return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getEnvironmentColor = (env: ExecutionEnvironment) => {
    switch (env) {
      case ExecutionEnvironment.SERVER: return 'bg-blue-100 text-blue-800';
      case ExecutionEnvironment.BROWSER: return 'bg-green-100 text-green-800';
      case ExecutionEnvironment.CONTAINER: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">🔌 Plugin Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'plugins', label: '🔌 Plugins', count: plugins.length },
            { key: 'executions', label: '⚡ Active', count: activeExecutions.length },
            { key: 'history', label: '📜 History', count: executionHistory.length },
            { key: 'create', label: '➕ Create', count: null }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-medium ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4">
          {/* Plugins Tab */}
          {activeTab === 'plugins' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plugins.map(plugin => (
                  <div
                    key={plugin.pluginName}
                    className="border rounded-lg p-4 hover:shadow-md cursor-pointer"
                    onClick={() => setSelectedPlugin(plugin)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{plugin.pluginName}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${getEnvironmentColor(plugin.executionContext)}`}>
                        {plugin.executionContext}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{plugin.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">v{plugin.version}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecutePlugin(plugin);
                        }}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                      >
                        Execute
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Plugin Details Modal */}
              {selectedPlugin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                  <div className="bg-white rounded-lg w-3/4 h-3/4 max-w-4xl flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="text-lg font-bold">{selectedPlugin.pluginName}</h3>
                      <button
                        onClick={() => setSelectedPlugin(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Description</h4>
                          <p>{selectedPlugin.description}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Parameters</h4>
                          <div className="space-y-2">
                            {Object.entries(selectedPlugin.parameters).map(([key, param]) => (
                              <div key={key} className="flex items-center space-x-4">
                                <span className="font-mono">{key}</span>
                                <span className="text-gray-600">({param.type})</span>
                                {param.required && <span className="text-red-500">*</span>}
                                <span className="text-sm text-gray-500">{param.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Code</h4>
                          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                            {selectedPlugin.inlineCode}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Executions Tab */}
          {activeTab === 'executions' && (
            <div className="space-y-4">
              {activeExecutions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No active executions</p>
              ) : (
                activeExecutions.map(execution => (
                  <div key={execution.requestId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold">{execution.pluginName}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${getEnvironmentColor(execution.environment)}`}>
                          {execution.environment}
                        </span>
                        <span className={`font-medium ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelExecution(execution.requestId)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      Started: {new Date(execution.startTime).toLocaleTimeString()}
                    </div>
                    {execution.logs.length > 0 && (
                      <div className="mt-2">
                        <h4 className="font-semibold text-sm mb-1">Logs:</h4>
                        <div className="bg-gray-100 p-2 rounded text-xs max-h-32 overflow-auto">
                          {execution.logs.map((log, i) => (
                            <div key={i}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Execution History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {executionHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No execution history</p>
              ) : (
                executionHistory.map(execution => (
                  <div key={execution.requestId} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{execution.pluginName}</span>
                        <span className={`px-2 py-1 rounded text-xs ${getEnvironmentColor(execution.environment)}`}>
                          {execution.environment}
                        </span>
                        <span className={`font-medium ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {execution.endTime ? 
                          `${new Date(execution.endTime).toLocaleTimeString()} (${execution.endTime.getTime() - execution.startTime.getTime()}ms)` :
                          'In progress'
                        }
                      </div>
                    </div>
                    {execution.result?.error && (
                      <div className="mt-2 text-sm text-red-600">
                        Error: {execution.result.error}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Create Plugin Tab */}
          {activeTab === 'create' && (
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plugin Name</label>
                <input
                  type="text"
                  value={newPlugin.name}
                  onChange={(e) => setNewPlugin(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="myCustomPlugin"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newPlugin.description}
                  onChange={(e) => setNewPlugin(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded px-3 py-2 h-20"
                  placeholder="Describe what this plugin does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Execution Environment</label>
                <select
                  value={newPlugin.environment}
                  onChange={(e) => setNewPlugin(prev => ({ ...prev, environment: e.target.value as ExecutionEnvironment }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value={ExecutionEnvironment.SERVER}>Server</option>
                  <option value={ExecutionEnvironment.BROWSER}>Browser</option>
                  <option value={ExecutionEnvironment.CONTAINER}>Container</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Plugin Code</label>
                <textarea
                  value={newPlugin.code}
                  onChange={(e) => setNewPlugin(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full border rounded px-3 py-2 font-mono h-64"
                  placeholder="function myCustomPlugin(param1, param2) {
  // Your plugin code here
  return { success: true, result: 'Hello World' };
}"
                />
              </div>

              <button
                onClick={handleCreatePlugin}
                disabled={loading || !newPlugin.name || !newPlugin.code}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Plugin'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}