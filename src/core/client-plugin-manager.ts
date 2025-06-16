// Client-safe plugin manager that makes API calls
import { 
  PluginDefinition, 
  PluginExecutionContext, 
  ExecutionEnvironment,
  PluginExecutionStatus 
} from '../types/plugins';

export class ClientPluginManager {
  private apiUrl = '/api/plugins';

  async getAvailablePlugins(): Promise<PluginDefinition[]> {
    try {
      const response = await fetch(`${this.apiUrl}/list`);
      if (!response.ok) throw new Error('Failed to fetch plugins');
      const data = await response.json();
      return data.plugins || [];
    } catch (error) {
      console.error('Error fetching plugins:', error);
      return [];
    }
  }

  async getActiveExecutions(): Promise<PluginExecutionContext[]> {
    try {
      const response = await fetch(`${this.apiUrl}/executions/active`);
      if (!response.ok) throw new Error('Failed to fetch active executions');
      const data = await response.json();
      return data.executions || [];
    } catch (error) {
      console.error('Error fetching active executions:', error);
      return [];
    }
  }

  async getExecutionHistory(limit: number = 50): Promise<PluginExecutionContext[]> {
    try {
      const response = await fetch(`${this.apiUrl}/executions/history?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch execution history');
      const data = await response.json();
      return data.executions || [];
    } catch (error) {
      console.error('Error fetching execution history:', error);
      return [];
    }
  }

  async executePlugin(request: { pluginName: string; parameters: Record<string, any> }): Promise<void> {
    const response = await fetch(`${this.apiUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute plugin');
    }
  }

  async registerPlugin(plugin: PluginDefinition): Promise<void> {
    const response = await fetch(`${this.apiUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plugin)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to register plugin');
    }
  }

  async cancelExecution(requestId: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/executions/${requestId}/cancel`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel execution');
    }
  }
}

// Export singleton instance
export const clientPluginManager = new ClientPluginManager();