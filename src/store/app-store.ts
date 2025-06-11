import { create } from 'zustand';

export interface LLMLogEntry {
  id: string;
  timestamp: Date;
  modelName: string;
  provider: string;
  prompt: string;
  response: string;
  duration?: number;
  error?: string;
  type: 'chat' | 'tools' | 'parsing' | 'agent';
  metadata?: Record<string, any>;
}

interface AppState {
  // UI State
  showSettings: boolean;
  showLogs: boolean;
  
  // Logs State
  logs: LLMLogEntry[];
  
  // Actions
  setShowSettings: (show: boolean) => void;
  setShowLogs: (show: boolean) => void;
  addLog: (log: Omit<LLMLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // UI State
  showSettings: false,
  showLogs: false,
  
  // Logs State
  logs: [],
  
  // Actions
  setShowSettings: (show: boolean) => set({ showSettings: show }),
  setShowLogs: (show: boolean) => set({ showLogs: show }),
  
  addLog: (log: Omit<LLMLogEntry, 'id' | 'timestamp'>) => {
    const newLog: LLMLogEntry = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    
    set(state => ({ 
      logs: [newLog, ...state.logs].slice(0, 1000) // Keep last 1000 logs
    }));
  },
  
  clearLogs: () => set({ logs: [] }),
}));