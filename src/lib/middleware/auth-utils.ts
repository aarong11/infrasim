import { NextRequest, NextResponse } from 'next/server';
import { 
  createAuthMiddleware, 
  AuthMiddlewareConfig, 
  getWalletUsageStats,
  addWalletDeposit,
  type AuthenticatedRequest
} from './auth-middleware';

// Re-export the AuthenticatedRequest type with proper syntax
export type { AuthenticatedRequest } from './auth-middleware';

/**
 * Predefined middleware configurations for common use cases
 */
export const MiddlewarePresets = {
  // Public endpoint - no authentication required
  public: (): AuthMiddlewareConfig => ({
    requireAuth: false,
  }),

  // Basic authenticated endpoint
  basicAuth: (): AuthMiddlewareConfig => ({
    requireAuth: true,
    requiredScopes: ['dao:member'],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 30,
      requestsPerHour: 300,
    },
  }),

  // Premium API with billing
  premium: (costPerRequest: string = '1000000000000000'): AuthMiddlewareConfig => ({ // 0.001 ETH
    requireAuth: true,
    requiredScopes: ['dao:member'],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
    billing: {
      enabled: true,
      costPerRequest,
      requireDeposit: true,
    },
  }),

  // Admin-only endpoints
  admin: (): AuthMiddlewareConfig => ({
    requireAuth: true,
    requiredScopes: ['dao:admin'],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      requestsPerHour: 2000,
    },
  }),

  // Endpoints requiring smart contract registration
  contractGated: (contractAddress: string): AuthMiddlewareConfig => ({
    requireAuth: true,
    requiredScopes: ['dao:member'],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 20,
      requestsPerHour: 200,
    },
    smartContract: {
      requireRegistration: true,
      contractAddress,
    },
  }),

  // AI/ML endpoints with higher costs
  aiEndpoint: (costPerRequest: string = '5000000000000000'): AuthMiddlewareConfig => ({ // 0.005 ETH
    requireAuth: true,
    requiredScopes: ['dao:member'],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 10,
      requestsPerHour: 50,
    },
    billing: {
      enabled: true,
      costPerRequest,
      requireDeposit: true,
    },
  }),
};

/**
 * Utility function to wrap API handlers with authentication middleware
 */
export function withAuth<T extends NextRequest = AuthenticatedRequest>(
  config: Partial<AuthMiddlewareConfig> | (() => AuthMiddlewareConfig),
  handler: (request: T) => Promise<NextResponse>
) {
  const middleware = createAuthMiddleware(
    typeof config === 'function' ? config() : config
  );
  
  return async (request: NextRequest) => {
    return middleware(request, handler as any);
  };
}

/**
 * Decorator for route handlers (if using class-based approach)
 */
export function AuthRequired(config: Partial<AuthMiddlewareConfig> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const middleware = createAuthMiddleware(config);
    
    descriptor.value = async function (request: NextRequest) {
      return middleware(request, originalMethod.bind(this));
    };
    
    return descriptor;
  };
}

/**
 * Utility to create wallet management endpoints
 */
export function createWalletManagementAPI() {
  return {
    // Get wallet usage statistics
    getUsageStats: withAuth(MiddlewarePresets.basicAuth(), async (request: AuthenticatedRequest) => {
      const walletAddress = request.wallet!.address;
      const stats = getWalletUsageStats(walletAddress);
      
      return NextResponse.json({
        success: true,
        walletAddress,
        stats,
        timestamp: new Date().toISOString(),
      });
    }),

    // Add deposit to wallet
    addDeposit: withAuth(MiddlewarePresets.basicAuth(), async (request: AuthenticatedRequest) => {
      const { amount } = await request.json();
      const walletAddress = request.wallet!.address;
      
      if (!amount || isNaN(parseFloat(amount))) {
        return NextResponse.json(
          { success: false, error: 'Invalid deposit amount' },
          { status: 400 }
        );
      }
      
      await addWalletDeposit(walletAddress, amount);
      
      return NextResponse.json({
        success: true,
        message: `Deposited ${amount} wei to wallet ${walletAddress}`,
        timestamp: new Date().toISOString(),
      });
    }),
  };
}

/**
 * Utility to check if request is authenticated
 */
export function isAuthenticated(request: NextRequest): request is AuthenticatedRequest {
  return 'wallet' in request && !!(request as AuthenticatedRequest).wallet?.authenticated;
}

/**
 * Get wallet address from authenticated request
 */
export function getWalletAddress(request: AuthenticatedRequest): string {
  if (!request.wallet?.authenticated) {
    throw new Error('Request is not authenticated');
  }
  return request.wallet.address;
}

/**
 * Check if wallet has required scope
 */
export function hasScope(request: AuthenticatedRequest, scope: string): boolean {
  return request.wallet?.scope.includes(scope) || false;
}

/**
 * Response helper for consistent API responses
 */
export class AuthAPIResponse {
  static success(data: any, status: number = 200) {
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data,
    }, { status });
  }

  static error(error: string, code: string, status: number = 400) {
    return NextResponse.json({
      success: false,
      error,
      code,
      timestamp: new Date().toISOString(),
    }, { status });
  }

  static unauthorized(message: string = 'Authentication required') {
    return this.error(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message: string = 'Insufficient permissions') {
    return this.error(message, 'FORBIDDEN', 403);
  }

  static rateLimit(message: string = 'Rate limit exceeded') {
    return this.error(message, 'RATE_LIMITED', 429);
  }

  static billingRequired(message: string = 'Insufficient balance') {
    return this.error(message, 'BILLING_REQUIRED', 402);
  }
}