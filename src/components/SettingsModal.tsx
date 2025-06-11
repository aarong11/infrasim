'use client';

import React, { useState, useEffect } from 'react';
import { ProcessingMode } from '../core/langchain-orchestrator';
import { ModelRole } from '../core/model-manager';
import { useAppStore } from '../store/app-store';

interface ModelConfig {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'local';
  processingMode: ProcessingMode;
  requiresApiKey: boolean;
  requiresOllamaHost: boolean;
  description: string;
  recommendedFor?: ModelRole[];
}

const AVAILABLE_MODELS: ModelConfig[] = [
  // Ollama Models optimized for different roles
  {
    id: 'llama3-groq-tool-use:latest',
    name: 'Llama 3 Groq Tool Use',
    type: 'ollama',
    processingMode: ProcessingMode.OPENAI_TOOLS,
    requiresApiKey: false,
    requiresOllamaHost: true,
    description: 'Specialized Llama 3 model optimized for tool usage and function calling with Groq enhancements',
    recommendedFor: [ModelRole.TOOLS]
  },
  {
    id: 'smangrul/llama-3-8b-instruct-function-calling',
    name: 'Llama 3 8B Function Calling',
    type: 'ollama',
    processingMode: ProcessingMode.LLAMA_CHAT,
    requiresApiKey: false,
    requiresOllamaHost: true,
    description: 'Local Llama model optimized for function calling and structured output',
    recommendedFor: [ModelRole.TOOLS]
  },
  {
    id: 'llama3.2:latest',
    name: 'Llama 3.2 Latest',
    type: 'ollama',
    processingMode: ProcessingMode.LLAMA_CHAT,
    requiresApiKey: false,
    requiresOllamaHost: true,
    description: 'Latest Llama 3.2 model for general purpose chat and conversation',
    recommendedFor: [ModelRole.CHAT]
  },
  {
    id: 'mistral:latest',
    name: 'Mistral Latest',
    type: 'ollama',
    processingMode: ProcessingMode.STRUCTURED_OUTPUT,
    requiresApiKey: false,
    requiresOllamaHost: true,
    description: 'Mistral model with structured output capabilities',
    recommendedFor: [ModelRole.TOOLS]
  },
  {
    id: 'codellama:latest',
    name: 'Code Llama Latest',
    type: 'ollama',
    processingMode: ProcessingMode.STRUCTURED_OUTPUT,
    requiresApiKey: false,
    requiresOllamaHost: true,
    description: 'Code-specialized Llama model for technical tasks',
    recommendedFor: [ModelRole.TOOLS]
  },
  // OpenAI Models
  {
    id: 'gpt-4',
    name: 'GPT-4',
    type: 'openai',
    processingMode: ProcessingMode.OPENAI_TOOLS,
    requiresApiKey: true,
    requiresOllamaHost: false,
    description: 'OpenAI GPT-4 with advanced function calling capabilities',
    recommendedFor: [ModelRole.CHAT, ModelRole.TOOLS]
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    type: 'openai',
    processingMode: ProcessingMode.OPENAI_TOOLS,
    requiresApiKey: true,
    requiresOllamaHost: false,
    description: 'Fast and efficient OpenAI model with function calling',
    recommendedFor: [ModelRole.CHAT, ModelRole.TOOLS]
  },
  // Anthropic Models
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    type: 'anthropic',
    processingMode: ProcessingMode.STRUCTURED_OUTPUT,
    requiresApiKey: true,
    requiresOllamaHost: false,
    description: 'Anthropic Claude 3 Sonnet for balanced performance',
    recommendedFor: [ModelRole.CHAT, ModelRole.TOOLS]
  }
];

interface DualModelConfig {
  chatModel: string;
  toolsModel: string;
  ollamaHost: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  temperature: number;
  maxRetries: number;
}

interface Settings extends DualModelConfig {
  // Extends DualModelConfig for consistency
}

export const SettingsModal: React.FC = () => {
  const { showSettings, setShowSettings } = useAppStore();

  const [settings, setSettings] = useState<Settings>({
    chatModel: 'llama3.2:latest',
    toolsModel: 'llama3-groq-tool-use:latest',
    ollamaHost: 'http://localhost:11434',
    openaiApiKey: '',
    anthropicApiKey: '',
    temperature: 0.1,
    maxRetries: 3
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('infrasim-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...settings, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const chatModelConfig = AVAILABLE_MODELS.find(m => m.id === settings.chatModel);
  const toolsModelConfig = AVAILABLE_MODELS.find(m => m.id === settings.toolsModel);

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('infrasim-settings', JSON.stringify(settings));
      
      // Notify parent component of model change
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`${settings.ollamaHost}/api/tags`);
      if (response.ok) {
        alert('✅ Ollama connection successful!');
      } else {
        alert('❌ Ollama connection failed. Check your host URL.');
      }
    } catch (error) {
      alert('❌ Failed to connect to Ollama. Make sure it\'s running and accessible.');
    }
  };

  const getRecommendationBadge = (model: ModelConfig, role: ModelRole) => {
    const isRecommended = model.recommendedFor?.includes(role);
    if (!isRecommended) return null;
    
    return (
      <span className="px-2 py-1 text-xs bg-green-600 text-white rounded-full ml-2">
        Recommended
      </span>
    );
  };

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span className="text-2xl">⚙️</span>
            <span>Dual Model Configuration</span>
          </h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chat Model Configuration */}
          <div className="space-y-4">
            <div className="bg-blue-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <span className="text-xl mr-2">💬</span>
                Chat Model
              </h3>
              <p className="text-sm text-blue-200 mb-4">
                Used for general conversation, help, and interactive responses
              </p>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">Select Chat Model:</label>
                <select
                  value={settings.chatModel}
                  onChange={(e) => handleSettingChange('chatModel', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {chatModelConfig && (
                <div className="bg-gray-700 p-3 rounded mt-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      chatModelConfig.type === 'ollama' ? 'bg-green-600' :
                      chatModelConfig.type === 'openai' ? 'bg-blue-600' :
                      chatModelConfig.type === 'anthropic' ? 'bg-purple-600' :
                      'bg-gray-600'
                    } text-white`}>
                      {chatModelConfig.type.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      chatModelConfig.processingMode === ProcessingMode.LLAMA_CHAT ? 'bg-orange-600' :
                      chatModelConfig.processingMode === ProcessingMode.OPENAI_TOOLS ? 'bg-blue-600' :
                      'bg-gray-600'
                    } text-white`}>
                      {chatModelConfig.processingMode.replace('_', ' ').toUpperCase()}
                    </span>
                    {getRecommendationBadge(chatModelConfig, ModelRole.CHAT)}
                  </div>
                  <p className="text-gray-300 text-sm">{chatModelConfig.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tools Model Configuration */}
          <div className="space-y-4">
            <div className="bg-green-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <span className="text-xl mr-2">🔧</span>
                Tools Model
              </h3>
              <p className="text-sm text-green-200 mb-4">
                Used for structured tasks, parsing, and function calling
              </p>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">Select Tools Model:</label>
                <select
                  value={settings.toolsModel}
                  onChange={(e) => handleSettingChange('toolsModel', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {toolsModelConfig && (
                <div className="bg-gray-700 p-3 rounded mt-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      toolsModelConfig.type === 'ollama' ? 'bg-green-600' :
                      toolsModelConfig.type === 'openai' ? 'bg-blue-600' :
                      toolsModelConfig.type === 'anthropic' ? 'bg-purple-600' :
                      'bg-gray-600'
                    } text-white`}>
                      {toolsModelConfig.type.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      toolsModelConfig.processingMode === ProcessingMode.LLAMA_CHAT ? 'bg-orange-600' :
                      toolsModelConfig.processingMode === ProcessingMode.OPENAI_TOOLS ? 'bg-blue-600' :
                      'bg-gray-600'
                    } text-white`}>
                      {toolsModelConfig.processingMode.replace('_', ' ').toUpperCase()}
                    </span>
                    {getRecommendationBadge(toolsModelConfig, ModelRole.TOOLS)}
                  </div>
                  <p className="text-gray-300 text-sm">{toolsModelConfig.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shared Configuration */}
        <div className="mt-8 space-y-6">
          {/* Ollama Configuration */}
          {(chatModelConfig?.requiresOllamaHost || toolsModelConfig?.requiresOllamaHost) && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Ollama Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Ollama Host URL:</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={settings.ollamaHost}
                      onChange={(e) => handleSettingChange('ollamaHost', e.target.value)}
                      placeholder="http://localhost:11434"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      onClick={handleTestConnection}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                      Test
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                      Make sure Ollama is running and accessible at this URL
                    </p>
                </div>
              </div>
            </div>
          )}

          {/* API Keys */}
          {(chatModelConfig?.requiresApiKey || toolsModelConfig?.requiresApiKey) && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">API Keys</h3>
              <div className="space-y-3">
                {(chatModelConfig?.type === 'openai' || toolsModelConfig?.type === 'openai') && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">OpenAI API Key:</label>
                    <input
                      type="password"
                      value={settings.openaiApiKey}
                      onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                )}
                {(chatModelConfig?.type === 'anthropic' || toolsModelConfig?.type === 'anthropic') && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Anthropic API Key:</label>
                    <input
                      type="password"
                      value={settings.anthropicApiKey}
                      onChange={(e) => handleSettingChange('anthropicApiKey', e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Advanced Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Temperature: {settings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Deterministic (0)</span>
                  <span>Creative (1)</span>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Max Retries:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxRetries}
                  onChange={(e) => handleSettingChange('maxRetries', parseInt(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-700">
          <button
            onClick={() => setShowSettings(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              await handleSave();
              setShowSettings(false);
            }}
            disabled={!isDirty || isSaving}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>}
            <span>💾 Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};