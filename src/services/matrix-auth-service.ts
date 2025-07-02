import { JWTAuthService } from './jwt-auth-service';

export interface MatrixUser {
  userId: string;
  accessToken: string;
  deviceId: string;
  displayName: string;
  walletAddress: string;
}

export interface MatrixRegistrationData {
  username: string;
  displayName: string;
  walletAddress: string;
}

export class MatrixAuthService {
  private static instance: MatrixAuthService;
  private jwtAuthService: JWTAuthService;
  private baseUrl: string;
  private currentUser: MatrixUser | null = null;
  private isReauthenticating: boolean = false;

  private constructor() {
    this.jwtAuthService = JWTAuthService.getInstance();
    this.baseUrl = process.env.NEXT_PUBLIC_MATRIX_SERVER_URL || 'http://localhost:8008';
  }

  static getInstance(): MatrixAuthService {
    if (!MatrixAuthService.instance) {
      MatrixAuthService.instance = new MatrixAuthService();
    }
    return MatrixAuthService.instance;
  }

  // Helper method to make authenticated Matrix API calls with automatic re-authentication
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.currentUser) {
      throw new Error('No Matrix user authenticated');
    }

    // Add authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.currentUser.accessToken}`
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Check if authentication failed
    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      
      if (errorData.code === 'MATRIX_AUTH_EXPIRED' || 
          errorData.error?.includes('authentication') || 
          errorData.errcode === 'M_UNKNOWN_TOKEN') {
        
        // Token is expired/invalid, attempt re-authentication
        console.log('Matrix token expired, attempting re-authentication...');
        
        if (!this.isReauthenticating) {
          this.isReauthenticating = true;
          
          try {
            await this.reauthenticate();
            this.isReauthenticating = false;
            
            // Retry the original request with new token
            const retryHeaders = {
              ...options.headers,
              'Authorization': `Bearer ${this.currentUser!.accessToken}`
            };
            
            return fetch(url, {
              ...options,
              headers: retryHeaders
            });
          } catch (reauthError) {
            this.isReauthenticating = false;
            console.error('Matrix re-authentication failed:', reauthError);
            
            // Clear invalid user data
            this.logout();
            
            throw new Error('Matrix authentication expired and re-authentication failed. Please reconnect to Matrix.');
          }
        } else {
          // Already re-authenticating, wait and throw error
          throw new Error('Matrix re-authentication in progress. Please try again.');
        }
      }
    }

    return response;
  }

  // Re-authenticate with Matrix using the same credentials
  private async reauthenticate(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No current user to re-authenticate');
    }

    console.log('Re-authenticating Matrix user:', this.currentUser.userId);

    try {
      // Use the JWT-based authentication endpoint
      const response = await this.jwtAuthService.authenticatedFetch('/api/matrix/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: this.currentUser.displayName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Re-authentication failed');
      }

      const data = await response.json();
      const newMatrixUser = data.matrixUser;

      // Update current user with new token
      this.currentUser = {
        ...this.currentUser,
        accessToken: newMatrixUser.accessToken,
        deviceId: newMatrixUser.deviceId
      };

      // Store updated user data
      this.storeMatrixUser(this.currentUser);

      console.log('Matrix re-authentication successful');
    } catch (error) {
      console.error('Matrix re-authentication error:', error);
      throw error;
    }
  }

  // Generate Matrix username from wallet address
  private generateMatrixUsername(walletAddress: string): string {
    const shortAddress = walletAddress.slice(2, 14).toLowerCase();
    return `wallet_${shortAddress}`;
  }

  // Generate Matrix password from wallet signature
  private async generateMatrixPassword(walletAddress: string): Promise<string> {
    // Use a deterministic message that includes the wallet address
    const message = `Matrix password for InfraSim user ${walletAddress}`;
    
    // Get the JWT auth service to sign this message
    const jwtPayload = this.jwtAuthService.getTokenPayload();
    if (!jwtPayload) {
      throw new Error('No JWT token available for password generation');
    }

    // For now, generate a deterministic password from the wallet address
    // In production, you might want to use the actual signature
    const encoder = new TextEncoder();
    const data = encoder.encode(message + walletAddress);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }

  // Check if user exists in Matrix
  private async checkUserExists(username: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/_matrix/client/v3/register/available?username=${username}`);
      const data = await response.json();
      // If available is false, user exists
      return !data.available;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  // Register new Matrix user
  private async registerMatrixUser(registrationData: MatrixRegistrationData): Promise<MatrixUser> {
    const username = this.generateMatrixUsername(registrationData.walletAddress);
    const password = await this.generateMatrixPassword(registrationData.walletAddress);

    const registerPayload = {
      username: username,
      password: password,
      device_id: `infrasim_${Date.now()}`,
      initial_device_display_name: 'InfraSim Wallet Client'
    };

    const response = await fetch(`${this.baseUrl}/_matrix/client/v3/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerPayload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Matrix registration failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();

    // Set display name
    await this.setDisplayName(data.access_token, registrationData.displayName);

    // Store wallet address in profile
    await this.setWalletProfile(data.access_token, registrationData.walletAddress);

    return {
      userId: data.user_id,
      accessToken: data.access_token,
      deviceId: data.device_id,
      displayName: registrationData.displayName,
      walletAddress: registrationData.walletAddress
    };
  }

  // Login existing Matrix user
  private async loginMatrixUser(walletAddress: string): Promise<MatrixUser> {
    const username = this.generateMatrixUsername(walletAddress);
    const password = await this.generateMatrixPassword(walletAddress);

    const loginPayload = {
      type: 'm.login.password',
      user: username,
      password: password,
      device_id: `infrasim_${Date.now()}`,
      initial_device_display_name: 'InfraSim Wallet Client'
    };

    const response = await fetch(`${this.baseUrl}/_matrix/client/v3/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginPayload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Matrix login failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();

    // Get user profile to retrieve display name
    const profile = await this.getUserProfile(data.access_token, data.user_id);

    return {
      userId: data.user_id,
      accessToken: data.access_token,
      deviceId: data.device_id,
      displayName: profile.displayname || username,
      walletAddress: walletAddress
    };
  }

  // Set user display name
  private async setDisplayName(accessToken: string, displayName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/_matrix/client/v3/profile/@${this.generateMatrixUsername('')}/displayname`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ displayname: displayName })
    });

    if (!response.ok) {
      console.warn('Failed to set display name:', await response.text());
    }
  }

  // Set wallet address in user profile
  private async setWalletProfile(accessToken: string, walletAddress: string): Promise<void> {
    const userId = this.jwtAuthService.getMatrixUserId();
    if (!userId) return;

    const response = await fetch(`${this.baseUrl}/_matrix/client/v3/profile/${userId}/wallet_address`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ wallet_address: walletAddress })
    });

    if (!response.ok) {
      console.warn('Failed to set wallet address in profile:', await response.text());
    }
  }

  // Get user profile
  private async getUserProfile(accessToken: string, userId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/_matrix/client/v3/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      return await response.json();
    }
    return {};
  }

  // Main authentication method - handles both registration and login
  async authenticateOrRegister(displayName?: string): Promise<MatrixUser> {
    // Ensure JWT is authenticated
    if (!this.jwtAuthService.isAuthenticated()) {
      throw new Error('JWT authentication required before Matrix authentication');
    }

    const walletAddress = this.jwtAuthService.getWalletAddress();
    if (!walletAddress) {
      throw new Error('No wallet address found in JWT token');
    }

    const username = this.generateMatrixUsername(walletAddress);

    try {
      // First try to login (user already exists)
      this.currentUser = await this.loginMatrixUser(walletAddress);
      
      // Store in localStorage
      this.storeMatrixUser(this.currentUser);
      
      return this.currentUser;
    } catch (loginError) {
      console.log('Login failed, attempting registration:', loginError);
      
      // If login fails, try to register
      if (!displayName) {
        // Prompt user for display name
        displayName = await this.promptForDisplayName();
      }

      try {
        this.currentUser = await this.registerMatrixUser({
          username,
          displayName,
          walletAddress
        });

        // Store in localStorage
        this.storeMatrixUser(this.currentUser);
        
        return this.currentUser;
      } catch (registerError) {
        console.error('Registration also failed:', registerError);
        throw new Error(`Failed to authenticate with Matrix: ${registerError}`);
      }
    }
  }

  // Prompt user for display name
  private async promptForDisplayName(): Promise<string> {
    return new Promise((resolve) => {
      const displayName = prompt('Please enter your display name for Matrix chat:');
      resolve(displayName || `Wallet User ${Date.now()}`);
    });
  }

  // Store Matrix user in localStorage
  private storeMatrixUser(user: MatrixUser): void {
    localStorage.setItem('matrixUser', JSON.stringify(user));
  }

  // Load Matrix user from localStorage
  loadStoredMatrixUser(): MatrixUser | null {
    try {
      const stored = localStorage.getItem('matrixUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Failed to load stored Matrix user:', error);
    }
    return null;
  }

  // Get current Matrix user
  getCurrentUser(): MatrixUser | null {
    return this.currentUser;
  }

  // Logout from Matrix
  async logout(): Promise<void> {
    if (this.currentUser) {
      try {
        await fetch(`${this.baseUrl}/_matrix/client/v3/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.currentUser.accessToken}`
          }
        });
      } catch (error) {
        console.error('Matrix logout failed:', error);
      }
    }

    this.currentUser = null;
    localStorage.removeItem('matrixUser');
  }

  // Get Matrix access token for SDK
  getAccessToken(): string | null {
    return this.currentUser?.accessToken || null;
  }

  // Get Matrix user ID
  getUserId(): string | null {
    return this.currentUser?.userId || null;
  }

  // Check if authenticated with Matrix
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentUser.accessToken !== null;
  }

  // Validate current token and re-authenticate if needed
  async validateAndRefreshToken(): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    try {
      // Test the current token by making a simple API call
      const response = await fetch(`${this.baseUrl}/_matrix/client/r0/account/whoami`, {
        headers: {
          'Authorization': `Bearer ${this.currentUser.accessToken}`
        }
      });

      if (response.ok) {
        return true; // Token is still valid
      }

      if (response.status === 401 || response.status === 403) {
        // Token is expired, attempt re-authentication
        console.log('Matrix token expired, re-authenticating...');
        await this.reauthenticate();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }
}