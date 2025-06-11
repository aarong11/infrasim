'use client';

import { useAppStore } from '../store/app-store';
import { Settings, Terminal, X } from 'lucide-react';

export default function TopMenuBar() {
  const { showSettings, showLogs, setShowSettings, setShowLogs } = useAppStore();

  return (
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
  );
}