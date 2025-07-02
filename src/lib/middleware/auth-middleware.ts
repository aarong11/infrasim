import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { contractRegistry } from '../services/contract-registry';

// JWT payload interface
export interface WalletJWTPayload {
  sub: string; // wallet address
  iat: number;
  exp: number;
  scope: string[];
}

// Request context after authentication
export interface AuthenticatedRequest extends NextRequest {
  wallet?: {
    address: string;
    scope: string[];
    authenticated: boolean;
  };
}

// Middleware configuration
export interface AuthMiddlewareConfig {
  requireAuth?: boolean;
  requiredScopes?: string[];
  rateLimiting?: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  billing?: {
    enabled: boolean;
    costPerRequest: string; // in wei
    requireDeposit: boolean;
  };
  smartContract?: {
    requireRegistration: boolean;
    contractAddress?: string;
  };
}

/**
 * Get deployed contract address from ContractRegistry
 */
async function getDeployedContractAddress(): Promise<string | null> {
  try {
    // Use ContractRegistry to resolve APIAccessRegistry
    return await contractRegistry.resolveWithFallback('APIAccessRegistry');
  } catch (error) {
    console.warn('Could not resolve APIAccessRegistry from registry:', error);
    return null;
  }
}

// Default configuration
const DEFAULT_CONFIG: AuthMiddlewareConfig = {
  requireAuth: true,
  requiredScopes: ['dao:member'],
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 10,
    requestsPerHour: 100,
  },
  billing: {
    enabled: false,
    costPerRequest: '0',
    requireDeposit: false,
  },
  smartContract: {
    requireRegistration: false,
  },
};

// In-memory stores (replace with Redis/database in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number; hourlyCount: number; hourlyResetTime: number }>();
const billingStore = new Map<string, { balance: string; totalSpent: string }>();

/**
 * Main authentication middleware factory
 */
export function createAuthMiddleware(config: Partial<AuthMiddlewareConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async function authMiddleware(
    request: NextRequest,
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Skip auth for health checks and public endpoints
      if (!finalConfig.requireAuth) {
        return handler(request as AuthenticatedRequest);
      }

      // Extract JWT token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Missing or invalid authorization header. Please provide a valid JWT token.',
            code: 'AUTH_REQUIRED'
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      
      // Verify JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET not configured');
        return NextResponse.json(
          { success: false, error: 'Server configuration error', code: 'SERVER_ERROR' },
          { status: 500 }
        );
      }

      let payload: WalletJWTPayload;
      try {
        payload = jwt.verify(token, jwtSecret) as WalletJWTPayload;
      } catch (jwtError) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid or expired token. Please re-authenticate with your wallet.',
            code: 'TOKEN_INVALID'
          },
          { status: 401 }
        );
      }

      // Validate wallet address format
      if (!ethers.isAddress(payload.sub)) {
        return NextResponse.json(
          { success: false, error: 'Invalid wallet address in token', code: 'WALLET_INVALID' },
          { status: 401 }
        );
      }

      // Check required scopes
      if (finalConfig.requiredScopes && finalConfig.requiredScopes.length > 0) {
        const hasRequiredScope = finalConfig.requiredScopes.some(scope => 
          payload.scope?.includes(scope)
        );
        if (!hasRequiredScope) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Insufficient permissions. Required scopes: ${finalConfig.requiredScopes.join(', ')}`,
              code: 'SCOPE_INSUFFICIENT'
            },
            { status: 403 }
          );
        }
      }

      // Rate limiting check
      if (finalConfig.rateLimiting?.enabled) {
        const rateLimitResult = await checkRateLimit(payload.sub, finalConfig.rateLimiting);
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { 
              success: false, 
              error: rateLimitResult.message,
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: rateLimitResult.retryAfter
            },
            { 
              status: 429,
              headers: {
                'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
              }
            }
          );
        }
      }

      // Smart contract registration check
      if (finalConfig.smartContract?.requireRegistration) {
        // Use provided contract address or fetch from deployment
        const contractAddress = finalConfig.smartContract.contractAddress || await getDeployedContractAddress();
        
        if (contractAddress) {
          const registrationResult = await checkSmartContractRegistration(payload.sub, contractAddress);
          if (!registrationResult.registered) {
            return NextResponse.json(
              { 
                success: false, 
                error: 'Wallet must be registered in the smart contract to access this service.',
                code: 'REGISTRATION_REQUIRED',
                contractAddress,
                registrationEndpoint: '/api/smart-contract/register'
              },
              { status: 403 }
            );
          }
        } else {
          console.warn('Smart contract registration required but no contract address available');
        }
      }

      // Billing and deposit check
      if (finalConfig.billing?.enabled) {
        const billingResult = await checkBillingAndDeposit(payload.sub, finalConfig.billing);
        if (!billingResult.allowed) {
          return NextResponse.json(
            { 
              success: false, 
              error: billingResult.message,
              code: 'BILLING_INSUFFICIENT',
              requiredDeposit: finalConfig.billing.costPerRequest
            },
            { status: 402 } // Payment Required
          );
        }
      }

      // Add wallet info to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.wallet = {
        address: payload.sub,
        scope: payload.scope || [],
        authenticated: true,
      };

      // Call the actual handler
      const response = await handler(authenticatedRequest);

      // Post-request billing (deduct cost after successful request)
      if (finalConfig.billing?.enabled && response.status < 400) {
        await processBilling(payload.sub, finalConfig.billing.costPerRequest);
      }

      // Add usage headers
      const usageHeaders = new Headers(response.headers);
      usageHeaders.set('X-Wallet-Address', payload.sub);
      usageHeaders.set('X-Request-Authenticated', 'true');
      
      if (finalConfig.rateLimiting?.enabled) {
        const usage = rateLimitStore.get(payload.sub);
        if (usage) {
          usageHeaders.set('X-RateLimit-Remaining-Minute', (finalConfig.rateLimiting.requestsPerMinute - usage.count).toString());
          usageHeaders.set('X-RateLimit-Remaining-Hour', (finalConfig.rateLimiting.requestsPerHour - usage.hourlyCount).toString());
        }
      }

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: usageHeaders,
      });

    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication system error',
          code: 'AUTH_SYSTEM_ERROR'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Rate limiting implementation
 */
async function checkRateLimit(
  walletAddress: string,
  config: { requestsPerMinute: number; requestsPerHour: number }
): Promise<{ allowed: boolean; message?: string; retryAfter?: number }> {
  const now = Date.now();
  const minuteWindow = 60 * 1000; // 1 minute
  const hourWindow = 60 * 60 * 1000; // 1 hour
  
  const usage = rateLimitStore.get(walletAddress) || {
    count: 0,
    resetTime: now + minuteWindow,
    hourlyCount: 0,
    hourlyResetTime: now + hourWindow,
  };

  // Reset minute counter if window expired
  if (now > usage.resetTime) {
    usage.count = 0;
    usage.resetTime = now + minuteWindow;
  }

  // Reset hourly counter if window expired
  if (now > usage.hourlyResetTime) {
    usage.hourlyCount = 0;
    usage.hourlyResetTime = now + hourWindow;
  }

  // Check minute limit
  if (usage.count >= config.requestsPerMinute) {
    return {
      allowed: false,
      message: `Rate limit exceeded: ${config.requestsPerMinute} requests per minute`,
      retryAfter: Math.ceil((usage.resetTime - now) / 1000),
    };
  }

  // Check hourly limit
  if (usage.hourlyCount >= config.requestsPerHour) {
    return {
      allowed: false,
      message: `Rate limit exceeded: ${config.requestsPerHour} requests per hour`,
      retryAfter: Math.ceil((usage.hourlyResetTime - now) / 1000),
    };
  }

  // Increment counters
  usage.count++;
  usage.hourlyCount++;
  rateLimitStore.set(walletAddress, usage);

  return { allowed: true };
}

/**
 * Smart contract registration check
 */
async function checkSmartContractRegistration(
  walletAddress: string,
  contractAddress?: string
): Promise<{ registered: boolean; message?: string }> {
  // Use provided address or resolve from registry
  const finalContractAddress = contractAddress || await getDeployedContractAddress();
  
  if (!finalContractAddress) {
    console.warn('No contract address available for registration check');
    return { registered: true }; // Allow if we can't check (fail open)
  }

  try {
    // Get provider
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Simple registration check (you can customize this based on your contract)
    const registrationABI = [
      'function isRegistered(address user) view returns (bool)',
      'function getUserInfo(address user) view returns (tuple(bool registered, uint256 depositAmount, uint256 totalSpent, uint256 lastActivity, bool isActive))'
    ];

    const contract = new ethers.Contract(finalContractAddress, registrationABI, provider);
    
    try {
      const isRegistered = await contract.isRegistered(walletAddress);
      return { 
        registered: isRegistered,
        message: isRegistered ? undefined : 'Wallet not registered in smart contract'
      };
    } catch (contractError) {
      // If isRegistered function doesn't exist, try getUserInfo
      try {
        const userInfo = await contract.getUserInfo(walletAddress);
        return { 
          registered: userInfo.registered,
          message: userInfo.registered ? undefined : 'Wallet not registered in smart contract'
        };
      } catch (fallbackError) {
        console.warn('Could not check registration status:', fallbackError);
        return { registered: true }; // Allow if we can't check
      }
    }
  } catch (error) {
    console.error('Error checking smart contract registration:', error);
    return { registered: true }; // Allow if we can't check (fail open)
  }
}

/**
 * Billing and deposit management
 */
async function checkBillingAndDeposit(
  walletAddress: string,
  config: { costPerRequest: string; requireDeposit: boolean }
): Promise<{ allowed: boolean; message?: string }> {
  if (!config.requireDeposit || config.costPerRequest === '0') {
    return { allowed: true };
  }

  const billing = billingStore.get(walletAddress) || {
    balance: '0',
    totalSpent: '0',
  };

  const currentBalance = ethers.getBigInt(billing.balance);
  const requestCost = ethers.getBigInt(config.costPerRequest);

  if (currentBalance < requestCost) {
    return {
      allowed: false,
      message: `Insufficient balance. Required: ${ethers.formatEther(requestCost)} ETH, Available: ${ethers.formatEther(currentBalance)} ETH`,
    };
  }

  return { allowed: true };
}

/**
 * Process billing after successful request
 */
async function processBilling(walletAddress: string, costPerRequest: string): Promise<void> {
  if (costPerRequest === '0') return;

  const billing = billingStore.get(walletAddress) || {
    balance: '0',
    totalSpent: '0',
  };

  const currentBalance = ethers.getBigInt(billing.balance);
  const requestCost = ethers.getBigInt(costPerRequest);
  const currentSpent = ethers.getBigInt(billing.totalSpent);

  billing.balance = (currentBalance - requestCost).toString();
  billing.totalSpent = (currentSpent + requestCost).toString();

  billingStore.set(walletAddress, billing);

  console.log(`Billed wallet ${walletAddress}: ${ethers.formatEther(requestCost)} ETH`);
}

/**
 * Helper function to add deposit (for manual deposit management)
 */
export async function addWalletDeposit(walletAddress: string, amount: string): Promise<void> {
  const billing = billingStore.get(walletAddress) || {
    balance: '0',
    totalSpent: '0',
  };

  const currentBalance = ethers.getBigInt(billing.balance);
  const depositAmount = ethers.getBigInt(amount);

  billing.balance = (currentBalance + depositAmount).toString();
  billingStore.set(walletAddress, billing);

  console.log(`Added deposit for wallet ${walletAddress}: ${ethers.formatEther(depositAmount)} ETH`);
}

/**
 * Helper function to get wallet usage stats
 */
export function getWalletUsageStats(walletAddress: string) {
  const rateLimit = rateLimitStore.get(walletAddress);
  const billing = billingStore.get(walletAddress);

  return {
    rateLimit: rateLimit ? {
      requestsThisMinute: rateLimit.count,
      requestsThisHour: rateLimit.hourlyCount,
      minuteResetTime: new Date(rateLimit.resetTime),
      hourlyResetTime: new Date(rateLimit.hourlyResetTime),
    } : null,
    billing: billing ? {
      balance: ethers.formatEther(billing.balance),
      totalSpent: ethers.formatEther(billing.totalSpent),
    } : null,
  };
}