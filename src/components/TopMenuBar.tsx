'use client';
import { useState, useEffect } from 'react';
import { navigateToIframe, IframeLink } from '../utils/iframe-navigation';
import { useAppStore } from '../store/app-store';
import { Settings, Terminal, Puzzle, Blocks, Home, Brain, Code } from 'lucide-react';
import { PluginModal } from './PluginModal';
import { WebAuthnWalletComponent } from './WebAuthnWalletComponent';
import { CompanyMemoryPanel } from './CompanyMemoryPanel';
import { DeveloperConsole } from './DeveloperConsole';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { ThemeToggle } from './ThemeToggle';

export default function TopMenuBar() {
  const { 
    showSettings, 
    showLogs, 
    showMemory, 
    showDeveloper, 
    showChat,
    setShowSettings, 
    setShowLogs, 
    setShowMemory, 
    setShowDeveloper, 
    setShowChat,
    toolCalls 
  } = useAppStore();
  
  const [showPluginModal, setShowPluginModal] = useState(false);
  const [vectorService] = useState(() => new ClientVectorMemoryService());

  // Convert ToolCall objects to ToolExecutionMetadata format for the plugin modal
  const convertToolCallsToExecutionMetadata = (toolCalls: any[]) => {
    return toolCalls.map(call => ({
      toolName: call.toolName,
      timestamp: call.timestamp,
      parameters: call.parameters,
      result: call.result,
      success: call.status === 'success',
      duration: call.duration || 0,
      environment: 'server',
      logs: [],
      error: call.error
    }));
  };

  // Listen for window messages to control chat and navigation from iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TOGGLE_CHAT') {
        setShowChat(!showChat);
      } else if (event.data.type === 'SHOW_CHAT') {
        setShowChat(true);
      } else if (event.data.type === 'HIDE_CHAT') {
        setShowChat(false);
      } else if (event.data.type === 'IFRAME_NAVIGATE') {
        // Handle navigation requests from iframes
        const newPath = event.data.path;
        // Trigger the iframe navigation event
        const navigationEvent = new CustomEvent('iframe-navigate', {
          detail: { path: newPath }
        });
        window.dispatchEvent(navigationEvent);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showChat, setShowChat]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[9998] theme-bg-secondary border-b theme-border-primary shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left side - Enhanced Logo/Title */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold theme-text-primary">InfraSim</h1>
                <span className="text-xs theme-text-tertiary">Infrastructure Simulation Platform</span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              <IframeLink
                href="/"
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary active:scale-95"
                title="Home"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </IframeLink>
              
              <button
                onClick={() => setShowPluginModal(true)}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                  showPluginModal
                    ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary'
                }`}
                title="Plugin Manager"
              >
                <Puzzle className="w-4 h-4 mr-2" />
                Plugins
                {toolCalls.length > 0 && (
                  <span className="ml-2 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {toolCalls.length}
                  </span>
                )}
              </button>
              
              <IframeLink
                href="/explorer"
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary active:scale-95"
                title="Block Explorer"
              >
                <Blocks className="w-4 h-4 mr-2" />
                Explorer
              </IframeLink>

              <IframeLink
                href="/matrix"
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary active:scale-95"
                title="Matrix Chat"
              >
                <span className="mr-2">💬</span>
                Chat
              </IframeLink>
              
              <IframeLink
                href="/faucet"
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary active:scale-95"
                title="Test Token Faucet"
              >
                <span className="mr-2">🚰</span>
                Faucet
              </IframeLink>
            </div>
          </div>

          {/* Right side - Utility buttons and Theme Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowMemory(!showMemory)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                showMemory
                  ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary'
              }`}
              title="Toggle Memory Panel"
            >
              <Brain className="w-4 h-4 mr-2" />
              Memory
              {showMemory && (
                <div className="ml-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              )}
            </button>
            
            <button
              onClick={() => setShowDeveloper(!showDeveloper)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                showDeveloper
                  ? 'bg-orange-900/40 text-orange-300 border border-orange-700/50'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary'
              }`}
              title="Toggle Developer Console"
            >
              <Code className="w-4 h-4 mr-2" />
              Developer
              {showDeveloper && (
                <div className="ml-2 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              )}
            </button>
            
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                showLogs
                  ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary'
              }`}
              title="Toggle LLM Logs Console"
            >
              <Terminal className="w-4 h-4 mr-2" />
              Logs
              {showLogs && (
                <div className="ml-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              )}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                showSettings
                  ? 'theme-bg-tertiary theme-text-primary border theme-border-secondary'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary'
              }`}
              title="Open Settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>

            {/* Theme Toggle - moved to far right */}
            <div className="border-l theme-border-primary pl-3 ml-3">
              <ThemeToggle />
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

      {/* Memory Panel */}
      {showMemory && (
        <div className="fixed top-20 right-4 w-[calc(50vw-1rem)] h-[calc(100vh-5rem)] theme-bg-primary border theme-border-primary rounded-lg shadow-2xl z-[9997] overflow-hidden">
          <div className="theme-bg-secondary px-4 py-3 border-b theme-border-primary flex items-center justify-between">
            <h3 className="text-lg font-semibold theme-text-primary flex items-center">
              <Brain className="w-5 h-5 mr-2 text-cyan-400" />
              Memory Panel
            </h3>
            <button
              onClick={() => setShowMemory(false)}
              className="theme-text-tertiary hover:theme-text-primary"
            >
              ×
            </button>
          </div>
          <div className="h-[calc(100vh-4rem)] overflow-auto">
            <CompanyMemoryPanel
              vectorService={vectorService}
              onCompanySelect={(company) => {
                console.log('Selected company:', company);
                // You can add additional logic here for company selection
              }}
            />
          </div>
        </div>
      )}

      {/* Developer Panel */}
      {showDeveloper && (
        <div className="fixed top-20 right-4 w-[calc(50vw-1rem)] h-[calc(100vh-5rem)] theme-bg-primary border theme-border-primary rounded-lg shadow-2xl z-[9997] overflow-hidden">
          <div className="theme-bg-secondary px-4 py-3 border-b theme-border-primary flex items-center justify-between">
            <h3 className="text-lg font-semibold theme-text-primary flex items-center">
              <Code className="w-5 h-5 mr-2 text-orange-400" />
              Developer Console
            </h3>
            <button
              onClick={() => setShowDeveloper(false)}
              className="theme-text-tertiary hover:theme-text-primary"
            >
              ×
            </button>
          </div>
          <div className="h-[calc(100vh-4rem)]">
            <DeveloperConsole />
          </div>
        </div>
      )}
    </>
  );
}