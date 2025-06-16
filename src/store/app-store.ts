import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// New interfaces for context and tool calls
export interface ToolCall {
  id: string;
  timestamp: Date;
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'success' | 'error';
  duration?: number;
  error?: string;
  context: AppContext;
}

export interface AppContext {
  mode: 'general_assistance' | 'infrastructure_management' | 'company_management' | 'api_management' | 'simulation_control';
  currentCompanyId?: string;
  currentEntityId?: string;
  viewState: {
    activeTab?: string;
    selectedEntity?: string;
    sidebarOpen?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface AgentWorkflowStep {
  id: string;
  timestamp: Date;
  stepType: 'tool_call' | 'decision' | 'context_switch' | 'user_interaction';
  description: string;
  toolCall?: ToolCall;
  data?: any;
  context: AppContext;
}

interface AppState {
  // UI State
  showSettings: boolean;
  showLogs: boolean;
  showToolCallLog: boolean;
  
  // Context Management
  currentContext: AppContext;
  contextHistory: AppContext[];
  
  // Logs State
  logs: LLMLogEntry[];
  toolCalls: ToolCall[];
  agentWorkflow: AgentWorkflowStep[];
  
  // Agent State
  isAgentActive: boolean;
  activeAgentTask?: string;
  
  // Actions - UI
  setShowSettings: (show: boolean) => void;
  setShowLogs: (show: boolean) => void;
  setShowToolCallLog: (show: boolean) => void;
  
  // Actions - Context
  setContext: (context: AppContext) => void;
  updateContext: (updates: Partial<AppContext>) => void;
  pushContextToHistory: () => void;
  restoreContextFromHistory: (index: number) => void;
  
  // Actions - Logging
  addLog: (log: Omit<LLMLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  
  // Actions - Tool Calls
  addToolCall: (toolCall: Omit<ToolCall, 'id' | 'timestamp'>) => void;
  updateToolCall: (id: string, updates: Partial<ToolCall>) => void;
  clearToolCalls: () => void;
  
  // Actions - Agent Workflow
  addWorkflowStep: (step: Omit<AgentWorkflowStep, 'id' | 'timestamp'>) => void;
  clearWorkflow: () => void;
  setAgentActive: (active: boolean, task?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // UI State
      showSettings: false,
      showLogs: false,
      showToolCallLog: false,
      
      // Context Management
      currentContext: {
        mode: 'general_assistance',
        viewState: {
          sidebarOpen: true
        }
      },
      contextHistory: [],
      
      // Logs State
      logs: [],
      toolCalls: [],
      agentWorkflow: [],
      
      // Agent State
      isAgentActive: false,
      
      // Actions - UI
      setShowSettings: (show: boolean) => set({ showSettings: show }),
      setShowLogs: (show: boolean) => set({ showLogs: show }),
      setShowToolCallLog: (show: boolean) => set({ showToolCallLog: show }),
      
      // Actions - Context
      setContext: (context: AppContext) => {
        const currentContext = get().currentContext;
        set({ 
          currentContext: context,
          contextHistory: [...get().contextHistory, currentContext].slice(-10) // Keep last 10 contexts
        });
        
        // Log context change
        get().addWorkflowStep({
          stepType: 'context_switch',
          description: `Context changed from ${currentContext.mode} to ${context.mode}`,
          context: context,
          data: { previousContext: currentContext, newContext: context }
        });
      },
      
      updateContext: (updates: Partial<AppContext>) => {
        const currentContext = get().currentContext;
        const newContext = { ...currentContext, ...updates };
        set({ currentContext: newContext });
      },
      
      pushContextToHistory: () => {
        const currentContext = get().currentContext;
        set({ 
          contextHistory: [...get().contextHistory, currentContext].slice(-10)
        });
      },
      
      restoreContextFromHistory: (index: number) => {
        const history = get().contextHistory;
        if (index >= 0 && index < history.length) {
          const restoredContext = history[index];
          set({ currentContext: restoredContext });
        }
      },
      
      // Actions - Logging
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
      
      // Actions - Tool Calls
      addToolCall: (toolCall: Omit<ToolCall, 'id' | 'timestamp'>) => {
        const newToolCall: ToolCall = {
          ...toolCall,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
        };
        
        set(state => ({ 
          toolCalls: [newToolCall, ...state.toolCalls].slice(0, 500) // Keep last 500 tool calls
        }));
        
        // Also add as workflow step
        get().addWorkflowStep({
          stepType: 'tool_call',
          description: `Called ${toolCall.toolName} with ${Object.keys(toolCall.parameters).length} parameters`,
          toolCall: newToolCall,
          context: toolCall.context
        });
      },
      
      updateToolCall: (id: string, updates: Partial<ToolCall>) => {
        set(state => ({
          toolCalls: state.toolCalls.map(call => 
            call.id === id ? { ...call, ...updates } : call
          )
        }));
      },
      
      clearToolCalls: () => set({ toolCalls: [] }),
      
      // Actions - Agent Workflow
      addWorkflowStep: (step: Omit<AgentWorkflowStep, 'id' | 'timestamp'>) => {
        const newStep: AgentWorkflowStep = {
          ...step,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
        };
        
        set(state => ({ 
          agentWorkflow: [newStep, ...state.agentWorkflow].slice(0, 200) // Keep last 200 steps
        }));
      },
      
      clearWorkflow: () => set({ agentWorkflow: [] }),
      
      setAgentActive: (active: boolean, task?: string) => {
        set({ isAgentActive: active, activeAgentTask: task });
        
        get().addWorkflowStep({
          stepType: 'user_interaction',
          description: active ? `Agent activated for task: ${task}` : 'Agent deactivated',
          context: get().currentContext,
          data: { active, task }
        });
      },
    }),
    {
      name: 'infrasim-app-store',
      partialize: (state) => ({
        // Persist context and some logs across sessions
        currentContext: state.currentContext,
        contextHistory: state.contextHistory.slice(-5), // Only persist last 5 contexts
        logs: state.logs.slice(0, 100), // Persist last 100 logs
        toolCalls: state.toolCalls.slice(0, 50), // Persist last 50 tool calls
        agentWorkflow: state.agentWorkflow.slice(0, 50), // Persist last 50 workflow steps
      }),
      version: 1,
    }
  )
);