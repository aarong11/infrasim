import { ethers } from 'ethers';

// Exponential backoff utility
class ExponentialBackoff {
  private attempt: number = 0;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly maxAttempts: number;
  private readonly jitter: boolean;

  constructor(
    baseDelay: number = 1000,
    maxDelay: number = 30000,
    maxAttempts: number = 5,
    jitter: boolean = true
  ) {
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.maxAttempts = maxAttempts;
    this.jitter = jitter;
  }

  async execute<T>(operation: () => Promise<T>, onRetry?: (attempt: number, error: Error) => void): Promise<T> {
    this.attempt = 0;
    
    while (this.attempt < this.maxAttempts) {
      try {
        const result = await operation();
        this.reset();
        return result;
      } catch (error) {
        this.attempt++;
        
        if (this.attempt >= this.maxAttempts) {
          throw error;
        }
        
        const delay = this.calculateDelay();
        
        if (onRetry) {
          onRetry(this.attempt, error as Error);
        }
        
        console.warn(`Operation failed (attempt ${this.attempt}/${this.maxAttempts}), retrying in ${delay}ms:`, error);
        await this.delay(delay);
      }
    }
    
    throw new Error('Max retry attempts exceeded');
  }

  private calculateDelay(): number {
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, this.attempt - 1),
      this.maxDelay
    );
    
    if (this.jitter) {
      // Add random jitter to prevent thundering herd
      return exponentialDelay * (0.5 + Math.random() * 0.5);
    }
    
    return exponentialDelay;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset(): void {
    this.attempt = 0;
  }

  getCurrentAttempt(): number {
    return this.attempt;
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  address: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  address: string | null;
  expiresAt: number | null;
}

export interface JWTPayload {
  address: string;
  walletAddress: string;
  type: string;
  iat: number;
  exp: number;
  sub: string;
  aud: string;
}

export class JWTAuthService {
  private static instance: JWTAuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    address: null,
    expiresAt: null
  };
  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: AuthState) => void> = new Set();
  
  // Reduced retry attempts to prevent spam
  private authBackoff = new ExponentialBackoff(2000, 10000, 2); // Only 2 attempts
  private refreshBackoff = new ExponentialBackoff(3000, 15000, 2); // Only 2 attempts  
  private apiBackoff = new ExponentialBackoff(1000, 5000, 2); // Only 2 attempts

  // Request deduplication
  private pendingRequests = new Map<string, Promise<any>>();

  private constructor() {
    this.loadStoredTokens();
    this.setupAutoRefresh();
  }

  static getInstance(): JWTAuthService {
    if (!JWTAuthService.instance) {
      JWTAuthService.instance = new JWTAuthService();
    }
    return JWTAuthService.instance;
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Step 1: Get nonce for wallet address
  async getNonce(address: string): Promise<string> {
    return await this.apiBackoff.execute(async () => {
      const response = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get nonce');
      }

      const data = await response.json();
      return data.nonce;
    }, (attempt, error) => {
      console.warn(`Nonce request failed (attempt ${attempt}):`, error.message);
    });
  }

  // Step 2: Sign nonce and authenticate
  async authenticate(address: string, privateKey: string): Promise<AuthTokens> {
    return await this.authBackoff.execute(async () => {
      // Get fresh nonce for each attempt (important for retries)
      const nonce = await this.getNonce(address);
      
      // Sign the nonce
      const wallet = new ethers.Wallet(privateKey);
      const message = `Sign this nonce to authenticate: ${nonce}`;
      const signature = await wallet.signMessage(message);

      // Verify signature and get tokens
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          signature,
          nonce
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const tokens: AuthTokens = await response.json();
      this.setTokens(tokens);
      
      return tokens;
    }, (attempt, error) => {
      console.warn(`Authentication failed (attempt ${attempt}):`, error.message);
      // If it's a nonce error, we don't want to retry with exponential backoff
      // as each retry needs a fresh nonce anyway
      if (error.message.includes('nonce')) {
        throw error; // Stop retrying for nonce-related errors
      }
    });
  }

  // Set tokens and update auth state
  private setTokens(tokens: AuthTokens): void {
    const expiresAt = Date.now() + (tokens.expiresIn * 1000);
    
    this.authState = {
      isAuthenticated: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      address: tokens.address,
      expiresAt
    };

    // Store in localStorage
    localStorage.setItem('authTokens', JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      address: tokens.address,
      expiresAt
    }));

    this.setupAutoRefresh();
    this.notifyListeners();
  }

  // Load stored tokens from localStorage
  private loadStoredTokens(): void {
    try {
      const stored = localStorage.getItem('authTokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        const now = Date.now();
        
        // Check if access token is still valid (with 1 minute buffer)
        if (tokens.expiresAt && tokens.expiresAt > now + 60000) {
          this.authState = {
            isAuthenticated: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            address: tokens.address,
            expiresAt: tokens.expiresAt
          };
          this.setupAutoRefresh();
        } else if (tokens.refreshToken) {
          // Try to refresh the token, but clear on failure
          this.refreshAccessToken().catch((error) => {
            console.warn('Failed to refresh stored token, clearing auth state:', error.message);
            this.clearTokens();
          });
        } else {
          // No valid tokens, clear everything
          this.clearTokens();
        }
      }
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
      this.clearTokens();
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(): Promise<void> {
    if (!this.authState.refreshToken) {
      throw new Error('No refresh token available');
    }

    await this.refreshBackoff.execute(async () => {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.authState.refreshToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Token refresh failed');
      }

      const tokens: AuthTokens = await response.json();
      this.setTokens(tokens);
    }, (attempt, error) => {
      console.warn(`Token refresh failed (attempt ${attempt}):`, error.message);
    });
  }

  // Setup automatic token refresh
  private setupAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.authState.expiresAt) return;

    // Refresh 2 minutes before expiry
    const refreshTime = this.authState.expiresAt - Date.now() - (2 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken().catch(error => {
          console.error('Auto refresh failed:', error);
        });
      }, refreshTime);
    }
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // Get access token for API requests
  getAccessToken(): string | null {
    return this.authState.accessToken;
  }

  // Get authorization header
  getAuthHeader(): Record<string, string> {
    if (this.authState.accessToken) {
      return {
        'Authorization': `Bearer ${this.authState.accessToken}`
      };
    }
    return {};
  }

  // Make authenticated API request with exponential backoff
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    return await this.apiBackoff.execute(async () => {
      const headers = {
        ...options.headers,
        ...this.getAuthHeader()
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      // If unauthorized, try to refresh token once
      if (response.status === 401 && this.authState.refreshToken) {
        try {
          await this.refreshAccessToken();
          // Retry with new token
          return await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              ...this.getAuthHeader()
            }
          });
        } catch (refreshError) {
          // If refresh fails, clear tokens and throw auth error
          console.warn('Token refresh failed, clearing auth state:', refreshError);
          this.clearTokens();
          throw new Error('Authentication failed - please re-authenticate with your wallet');
        }
      }

      return response;
    }, (attempt, error) => {
      console.warn(`API call failed (attempt ${attempt}) for ${url}:`, error.message);
    });
  }

  // Revoke tokens and logout
  async logout(revokeAll: boolean = false): Promise<void> {
    try {
      if (this.authState.refreshToken) {
        await this.apiBackoff.execute(async () => {
          const response = await fetch('/api/auth/revoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...this.getAuthHeader()
            },
            body: JSON.stringify({
              refreshToken: this.authState.refreshToken,
              revokeAll
            })
          });
          
          if (!response.ok) {
            throw new Error(`Logout failed: ${response.status}`);
          }
        }, (attempt, error) => {
          console.warn(`Logout failed (attempt ${attempt}):`, error.message);
        });
      }
    } catch (error) {
      console.error('Token revocation failed after retries:', error);
    } finally {
      this.clearTokens();
    }
  }

  // Clear all tokens and auth state
  private clearTokens(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.authState = {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      address: null,
      expiresAt: null
    };

    localStorage.removeItem('authTokens');
    this.notifyListeners();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && 
           this.authState.accessToken !== null &&
           (this.authState.expiresAt || 0) > Date.now();
  }

  // Get current user address
  getCurrentAddress(): string | null {
    return this.authState.address;
  }

  // Get wallet address from current token
  getWalletAddress(): string | null {
    if (!this.authState.accessToken) return null;
    
    try {
      const payload = this.decodeToken(this.authState.accessToken);
      return payload.walletAddress || payload.address || null;
    } catch (error) {
      console.error('Failed to decode token for wallet address:', error);
      return null;
    }
  }

  // Decode JWT token without verification (for extracting payload)
  private decodeToken(token: string): JWTPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded as JWTPayload;
  }

  // Get full decoded payload from current token
  getTokenPayload(): JWTPayload | null {
    if (!this.authState.accessToken) return null;
    
    try {
      return this.decodeToken(this.authState.accessToken);
    } catch (error) {
      console.error('Failed to decode token payload:', error);
      return null;
    }
  }

  // Check if token is for Matrix audience
  isMatrixToken(): boolean {
    const payload = this.getTokenPayload();
    return payload?.aud === 'infrasim-matrix';
  }

  // Get Matrix-compatible user ID from wallet address
  getMatrixUserId(serverName: string = 'localhost'): string | null {
    const walletAddress = this.getWalletAddress();
    if (!walletAddress) return null;
    
    // Convert wallet address to Matrix user ID format
    // Remove 0x prefix and use first 12 characters to keep it manageable
    const shortAddress = walletAddress.slice(2, 14).toLowerCase();
    return `@wallet_${shortAddress}:${serverName}`;
  }
}