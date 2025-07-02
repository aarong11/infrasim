interface ThrottleOptions {
  minInterval?: number; // Minimum time between calls (ms)
  maxBackoff?: number; // Maximum backoff time (ms)
  maxRetries?: number; // Maximum number of retries
  baseBackoff?: number; // Base backoff time (ms)
}

interface CallState {
  lastCallTime: number;
  retryCount: number;
  backoffTime: number;
  isInProgress: boolean;
}

export class APIThrottler {
  private callStates = new Map<string, CallState>();
  private options: Required<ThrottleOptions>;

  constructor(options: ThrottleOptions = {}) {
    this.options = {
      minInterval: options.minInterval ?? 1000, // 1 second minimum
      maxBackoff: options.maxBackoff ?? 30000, // 30 second max backoff
      maxRetries: options.maxRetries ?? 5, // 5 retries max
      baseBackoff: options.baseBackoff ?? 2000, // 2 second base backoff
    };
  }

  /**
   * Execute an API call with throttling and exponential backoff
   */
  async throttledCall<T>(
    fn: () => Promise<T>,
    key: string = 'default',
    options?: Partial<ThrottleOptions>
  ): Promise<T> {
    const effectiveOptions = { ...this.options, ...options };
    const state = this.getOrCreateState(key);

    // Prevent concurrent calls with the same key
    if (state.isInProgress) {
      throw new Error('API call already in progress for this key');
    }

    try {
      state.isInProgress = true;
      
      // Apply minimum interval throttling
      await this.enforceMinInterval(state, effectiveOptions.minInterval);
      
      // Execute with retry logic
      return await this.executeWithRetry(fn, state, effectiveOptions);
    } finally {
      state.isInProgress = false;
    }
  }

  /**
   * Reset backoff state for manual refresh
   */
  reset(key: string = 'default'): void {
    const state = this.callStates.get(key);
    if (state) {
      state.retryCount = 0;
      state.backoffTime = this.options.baseBackoff;
    }
  }

  /**
   * Reset all throttling states
   */
  resetAll(): void {
    this.callStates.clear();
  }

  /**
   * Get current state for debugging
   */
  getState(key: string = 'default'): Readonly<CallState> | null {
    const state = this.callStates.get(key);
    return state ? { ...state } : null;
  }

  private getOrCreateState(key: string): CallState {
    if (!this.callStates.has(key)) {
      this.callStates.set(key, {
        lastCallTime: 0,
        retryCount: 0,
        backoffTime: this.options.baseBackoff,
        isInProgress: false,
      });
    }
    return this.callStates.get(key)!;
  }

  private async enforceMinInterval(state: CallState, minInterval: number): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - state.lastCallTime;
    
    if (timeSinceLastCall < minInterval) {
      const waitTime = minInterval - timeSinceLastCall;
      await this.sleep(waitTime);
    }
    
    state.lastCallTime = Date.now();
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    state: CallState,
    options: Required<ThrottleOptions>
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        // Apply backoff delay for retries
        if (attempt > 0) {
          await this.sleep(state.backoffTime);
          // Update backoff for next retry (exponential)
          state.backoffTime = Math.min(
            state.backoffTime * 2,
            options.maxBackoff
          );
        }

        const result = await fn();
        
        // Success - reset backoff
        state.retryCount = 0;
        state.backoffTime = options.baseBackoff;
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        state.retryCount = attempt + 1;

        // Don't retry on certain error types
        if (this.shouldNotRetry(error)) {
          throw lastError;
        }

        // Check if we've exceeded max retries
        if (attempt >= options.maxRetries) {
          break;
        }

        console.warn(`API call failed (attempt ${attempt + 1}/${options.maxRetries + 1}):`, lastError.message);
      }
    }

    throw new Error(`API call failed after ${options.maxRetries + 1} attempts: ${lastError.message}`);
  }

  private shouldNotRetry(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Don't retry on client errors (4xx) except rate limiting
      if (message.includes('400') && !message.includes('rate limit')) return true;
      if (message.includes('401')) return true; // Unauthorized
      if (message.includes('403') && !message.includes('rate limit')) return true;
      if (message.includes('404')) return true; // Not found
      if (message.includes('422')) return true; // Validation error
      
      // Don't retry on abort/cancel
      if (message.includes('abort') || message.includes('cancel')) return true;
    }
    
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create a singleton instance for general use
export const defaultApiThrottler = new APIThrottler();

// Utility function for simple throttled fetch calls
export async function throttledFetch(
  url: string,
  options?: RequestInit,
  throttleKey?: string,
  throttleOptions?: ThrottleOptions
): Promise<Response> {
  return defaultApiThrottler.throttledCall(
    () => fetch(url, options),
    throttleKey || url,
    throttleOptions
  );
}