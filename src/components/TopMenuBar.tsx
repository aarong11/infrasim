'use client';

import { useState } from 'react';
import { useAppStore } from '../store/app-store';
import { Settings, Terminal, Puzzle } from 'lucide-react';
import { PluginModal } from './PluginModal';

export default function TopMenuBar() {
  const { showSettings, showLogs, setShowSettings, setShowLogs, toolCalls } = useAppStore();
  const [showPluginModal, setShowPluginModal] = useState(false);

  // Convert ToolCall objects to ToolExecutionMetadata format for the plugin modal
  const convertToolCallsToExecutionMetadata = (toolCalls: any[]) => {
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
    <>
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-white shadow-md border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left side - Logo/Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-800">InfraSim</h1>
            <span className="text-sm text-gray-500">Infrastructure Simulation Platform</span>
          </div>

          {/* Right side - Menu buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPluginModal(true)}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showPluginModal
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Plugin Manager"
            >
              <Puzzle className="w-4 h-4 mr-2" />
              Plugins
            </button>

            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showLogs
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Toggle LLM Logs Console"
            >
              <Terminal className="w-4 h-4 mr-2" />
              Logs
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showSettings
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Open Settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Plugin Modal */}
      <PluginModal 
        isOpen={showPluginModal}
        onClose={() => setShowPluginModal(false)}
        recentExecutions={convertToolCallsToExecutionMetadata(toolCalls)}
      />
    </>
  );
}