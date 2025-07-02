// Client-safe plugin manager that makes API calls
import { 
  PluginDefinition, 
  PluginExecutionContext 
} from '../types/plugins';
import { APIThrottler } from '../utils/api-throttler';

export class ClientPluginManager {
  private apiUrl = '/api/plugins';
  private throttler = new APIThrottler({
    minInterval: 1000,
    maxBackoff: 30000,
    maxRetries: 3,
    baseBackoff: 2000
  });

  async getAvailablePlugins(): Promise<PluginDefinition[]> {
    try {
      const response = await this.throttler.throttledCall(
        () => fetch(`${this.apiUrl}/list`),
        'plugins-list'
      );
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
      const response = await this.throttler.throttledCall(
        () => fetch(`${this.apiUrl}/executions/active`),
        'plugins-active-executions'
      );
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
      const response = await this.throttler.throttledCall(
        () => fetch(`${this.apiUrl}/executions/history?limit=${limit}`),
        'plugins-execution-history'
      );
      if (!response.ok) throw new Error('Failed to fetch execution history');
      const data = await response.json();
      return data.executions || [];
    } catch (error) {
      console.error('Error fetching execution history:', error);
      return [];
    }
  }

  async executePlugin(request: { pluginName: string; parameters: Record<string, any> }): Promise<void> {
    try {
      const response = await this.throttler.throttledCall(
        () => fetch(`${this.apiUrl}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }),
        `plugin-execute-${request.pluginName}`
      );
      if (!response.ok) throw new Error('Failed to execute plugin');
    } catch (error) {
      console.error('Error executing plugin:', error);
      throw error;
    }
  }

  async registerPlugin(plugin: PluginDefinition): Promise<void> {
    try {
      const response = await this.throttler.throttledCall(
        () => fetch(`${this.apiUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plugin),
        }),
        'plugin-register'
      );
      if (!response.ok) throw new Error('Failed to register plugin');
    } catch (error) {
      console.error('Error registering plugin:', error);
      throw error;
    }
  }

  async cancelExecution(requestId: string): Promise<void> {
    try {
      const response = await this.throttler.throttledCall(
        () => fetch(`${this.apiUrl}/executions/${requestId}/cancel`, {
          method: 'POST',
        }),
        `plugin-cancel-${requestId}`
      );
      if (!response.ok) throw new Error('Failed to cancel execution');
    } catch (error) {
      console.error('Error cancelling execution:', error);
      throw error;
    }
  }

  /**
   * Reset throttling state for manual refresh
   */
  resetThrottling(): void {
    this.throttler.resetAll();
  }
}

// Export singleton instance
export const clientPluginManager = new ClientPluginManager();