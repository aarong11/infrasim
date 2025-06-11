'use client';

import { useAppStore, LLMLogEntry } from '../store/app-store';
import { X, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function LogsConsole() {
  const { showLogs, setShowLogs, logs, clearLogs } = useAppStore();
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  if (!showLogs) return null;

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      chat: 'bg-green-100 text-green-800',
      tools: 'bg-blue-100 text-blue-800',
      parsing: 'bg-yellow-100 text-yellow-800',
      agent: 'bg-purple-100 text-purple-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed top-16 right-0 bottom-0 w-1/2 bg-white shadow-xl border-l border-gray-200 z-[9997] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-800">LLM Logs Console</h3>
          <span className="text-sm text-gray-500">({logs.length} entries)</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearLogs}
            className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
            title="Clear all logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLogs(false)}
            className="inline-flex items-center p-1 text-gray-500 hover:bg-gray-200 rounded"
            title="Close logs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-gray-400 mb-2">No LLM interactions yet</div>
            <div className="text-sm">Start using the system to see logs appear here</div>
          </div>
        ) : (
          logs.map((log) => (
            <LogEntry
              key={log.id}
              log={log}
              isExpanded={expandedLogs.has(log.id)}
              onToggleExpansion={() => toggleLogExpansion(log.id)}
              onCopy={copyToClipboard}
              getTypeColor={getTypeColor}
              formatDuration={formatDuration}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface LogEntryProps {
  log: LLMLogEntry;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onCopy: (text: string) => void;
  getTypeColor: (type: string) => string;
  formatDuration: (ms?: number) => string;
}

function LogEntry({ log, isExpanded, onToggleExpansion, onCopy, getTypeColor, formatDuration }: LogEntryProps) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpansion}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(log.type)}`}>
            {log.type}
          </span>
          <span className="font-medium text-gray-800">{log.modelName}</span>
          <span className="text-sm text-gray-500">{log.provider}</span>
          {log.duration && (
            <span className="text-xs text-gray-400">{formatDuration(log.duration)}</span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {log.timestamp.toLocaleTimeString()}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Prompt</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(log.prompt);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
              {log.prompt}
            </pre>
          </div>

          {/* Response */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                {log.error ? 'Error' : 'Response'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(log.error || log.response);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <pre className={`text-xs p-2 rounded border overflow-x-auto whitespace-pre-wrap ${
              log.error ? 'bg-red-50 text-red-800' : 'bg-green-50'
            }`}>
              {log.error || log.response}
            </pre>
          </div>

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700">Metadata</span>
              <pre className="text-xs bg-blue-50 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}