import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  chatModel: string;
  toolsModel: string;
  ollamaHost: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  lambdaApiKey: string;
  temperature: number;
  maxRetries: number;
  modelMode: 'single' | 'dual';
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  chatModel: 'llama-4-maverick-17b-128e-instruct-fp8',
  toolsModel: 'llama-4-maverick-17b-128e-instruct-fp8',
  ollamaHost: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434', // Use public env var for frontend
  openaiApiKey: '',
  anthropicApiKey: '',
  lambdaApiKey: '',
  temperature: 0.1,
  maxRetries: 3,
  modelMode: 'single'
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      }
    }),
    {
      name: 'infrasim-settings'
    }
  )
);