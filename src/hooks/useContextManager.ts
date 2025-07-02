'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { InfrastructureEntity } from '@lib/infrastructure';
import { useAppStore, AppContext } from '@store/app-store';

export interface ContextManagerOptions {
  autoDetectContext?: boolean;
  persistAcrossSessions?: boolean;
}

export const useContextManager = (options: ContextManagerOptions = {}) => {
  const { 
    currentContext, 
    setContext, 
    updateContext, 
    addWorkflowStep,
    setAgentActive 
  } = useAppStore();

  const { autoDetectContext = true, persistAcrossSessions = true } = options;

  // Context detection based on current state
  const detectContextFromState = useCallback((state: {
    selectedEntity?: string;
    activeTab?: string;
    currentCompanyId?: string;
    isInInfrastructureView?: boolean;
    isInCompanyView?: boolean;
  }): AppContext['mode'] => {
    if (state.isInInfrastructureView || state.selectedEntity) {
      return 'infrastructure_management';
    }
    if (state.isInCompanyView || state.currentCompanyId) {
      return 'company_management';
    }
    if (state.activeTab === 'developer') {
      return 'api_management';
    }
    return 'general_assistance';
  }, []);

  // Update context based on application state changes
  const updateContextFromState = useCallback((state: {
    selectedEntity?: string;
    activeTab?: string;
    currentCompanyId?: string;
    isInInfrastructureView?: boolean;
    isInCompanyView?: boolean;
    sidebarOpen?: boolean;
  }) => {
    if (!autoDetectContext) return;

    const newMode = detectContextFromState(state);
    const currentMode = currentContext.mode;

    if (newMode !== currentMode) {
      const newContext: AppContext = {
        mode: newMode,
        currentCompanyId: state.currentCompanyId,
        currentEntityId: state.selectedEntity,
        viewState: {
          activeTab: state.activeTab,
          selectedEntity: state.selectedEntity,
          sidebarOpen: state.sidebarOpen
        },
        metadata: {
          autoDetected: true,
          previousMode: currentMode,
          timestamp: new Date().toISOString()
        }
      };

      setContext(newContext);
    } else {
      // Only update view state if it has actually changed
      const currentViewState = currentContext.viewState || {};
      const newViewState = {
        activeTab: state.activeTab,
        selectedEntity: state.selectedEntity,
        sidebarOpen: state.sidebarOpen
      };

      // Check if view state actually changed to prevent unnecessary updates
      const viewStateChanged = 
        currentViewState.activeTab !== newViewState.activeTab ||
        currentViewState.selectedEntity !== newViewState.selectedEntity ||
        currentViewState.sidebarOpen !== newViewState.sidebarOpen;

      if (viewStateChanged || currentContext.currentCompanyId !== state.currentCompanyId || currentContext.currentEntityId !== state.selectedEntity) {
        updateContext({
          currentCompanyId: state.currentCompanyId,
          currentEntityId: state.selectedEntity,
          viewState: newViewState
        });
      }
    }
  }, [autoDetectContext, currentContext, setContext, updateContext, detectContextFromState]);

  // Manual context switching functions
  const switchToGeneralAssistance = useCallback(() => {
    setContext({
      mode: 'general_assistance',
      viewState: currentContext.viewState,
      metadata: { manualSwitch: true }
    });
  }, [setContext, currentContext.viewState]);

  const switchToInfrastructureManagement = useCallback((entityId?: string) => {
    setContext({
      mode: 'infrastructure_management',
      currentEntityId: entityId,
      viewState: {
        ...currentContext.viewState,
        selectedEntity: entityId
      },
      metadata: { manualSwitch: true }
    });
  }, [setContext, currentContext.viewState]);

  const switchToCompanyManagement = useCallback((companyId?: string) => {
    setContext({
      mode: 'company_management',
      currentCompanyId: companyId,
      viewState: currentContext.viewState,
      metadata: { manualSwitch: true }
    });
  }, [setContext, currentContext.viewState]);

  const switchToApiManagement = useCallback(() => {
    setContext({
      mode: 'api_management',
      viewState: {
        ...currentContext.viewState,
        activeTab: 'developer'
      },
      metadata: { manualSwitch: true }
    });
  }, [setContext, currentContext.viewState]);

  const switchToSimulationControl = useCallback(() => {
    setContext({
      mode: 'simulation_control',
      viewState: currentContext.viewState,
      metadata: { manualSwitch: true }
    });
  }, [setContext, currentContext.viewState]);

  // Context-aware tool execution wrapper
  const executeWithContext = useCallback(async <T>(
    toolName: string,
    parameters: Record<string, any>,
    executor: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    
    // Add initial tool call log
    const { addToolCall, updateToolCall } = useAppStore.getState();
    
    const toolCallId = Math.random().toString(36).substr(2, 9);
    addToolCall({
      toolName,
      parameters,
      status: 'pending',
      context: currentContext
    });

    try {
      setAgentActive(true, `Executing ${toolName}`);
      
      const result = await executor();
      const duration = Date.now() - startTime;

      // Update tool call with success
      updateToolCall(toolCallId, {
        status: 'success',
        result,
        duration
      });

      addWorkflowStep({
        stepType: 'tool_call',
        description: `Successfully executed ${toolName}`,
        context: currentContext,
        data: { result, duration }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update tool call with error
      updateToolCall(toolCallId, {
        status: 'error',
        error: errorMessage,
        duration
      });

      addWorkflowStep({
        stepType: 'tool_call',
        description: `Failed to execute ${toolName}: ${errorMessage}`,
        context: currentContext,
        data: { error: errorMessage, duration }
      });

      throw error;
    } finally {
      setAgentActive(false);
    }
  }, [currentContext, setAgentActive, addWorkflowStep]);

  // Get context-appropriate instructions for the agent
  const getContextInstructions = useCallback((): string => {
    switch (currentContext.mode) {
      case 'infrastructure_management':
        return `You are currently in Infrastructure Management mode. Focus on:
- Creating, modifying, and connecting infrastructure components
- Managing entity properties, ports, and configurations
- Network topology and security considerations
- Performance and scalability recommendations
${currentContext.currentEntityId ? `Currently selected entity: ${currentContext.currentEntityId}` : ''}`;

      case 'company_management':
        return `You are currently in Company Management mode. Focus on:
- Creating and managing company profiles
- Organizing company infrastructure and services
- Business context and sector-specific recommendations
- Company relationships and similarities
${currentContext.currentCompanyId ? `Currently selected company: ${currentContext.currentCompanyId}` : ''}`;

      case 'api_management':
        return `You are currently in API Management mode. Focus on:
- API endpoint creation and management
- OpenAPI specification generation
- API testing and validation
- Integration patterns and best practices`;

      case 'simulation_control':
        return `You are currently in Simulation Control mode. Focus on:
- Starting, stopping, and configuring simulations
- Monitoring simulation state and performance
- Analyzing simulation results and logs
- Adjusting simulation parameters`;

      case 'general_assistance':
      default:
        return `You are in General Assistance mode. You can help with:
- Answering questions about the infrastructure simulation platform
- Guiding users through different features and modes
- Providing general advice on infrastructure design
- Switching to more specific modes when needed`;
    }
  }, [currentContext]);

  // Get context-aware chat history filtering
  const getRelevantChatHistory = useCallback((chatHistory: any[], maxItems: number = 10) => {
    // Filter chat history based on current context
    const relevantHistory = chatHistory.filter(message => {
      // Always include recent messages
      const isRecent = Date.now() - new Date(message.timestamp).getTime() < 10 * 60 * 1000; // 10 minutes
      
      // Include messages from the same context mode
      const isSameContext = message.context?.mode === currentContext.mode;
      
      // Include messages related to current entity/company
      const isRelatedToCurrentEntity = 
        (currentContext.currentEntityId && message.content.includes(currentContext.currentEntityId)) ||
        (currentContext.currentCompanyId && message.content.includes(currentContext.currentCompanyId));

      return isRecent || isSameContext || isRelatedToCurrentEntity;
    });

    return relevantHistory.slice(-maxItems);
  }, [currentContext]);

  return {
    // Current context state
    currentContext,
    
    // Context detection and updates
    updateContextFromState,
    detectContextFromState,
    
    // Manual context switching
    switchToGeneralAssistance,
    switchToInfrastructureManagement,
    switchToCompanyManagement,
    switchToApiManagement,
    switchToSimulationControl,
    
    // Context-aware execution
    executeWithContext,
    getContextInstructions,
    getRelevantChatHistory,
    
    // Utility functions
    isInMode: (mode: AppContext['mode']) => currentContext.mode === mode,
    hasEntity: () => !!currentContext.currentEntityId,
    hasCompany: () => !!currentContext.currentCompanyId,
  };
};