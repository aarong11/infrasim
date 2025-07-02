# Wallet Authentication Middleware System

A comprehensive authentication and billing system for Ethereum wallet-based API access, built for the InfraSim platform.

## Overview

This system provides:
- ✅ **Wallet Signature Authentication** - Users sign nonces with their Ethereum wallets
- ✅ **JWT Token Management** - Secure, stateless authentication tokens
- ✅ **Rate Limiting** - Per-wallet request throttling
- ✅ **Billing & Deposits** - Pay-per-request API usage
- ✅ **Smart Contract Integration** - On-chain registration and deposit management
- ✅ **Scope-based Permissions** - Role-based access control

## Quick Start

### 1. Authentication Flow

```typescript
// 1. Request a nonce
const nonceResponse = await fetch('/api/wallet-auth/request-nonce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wallet: '0x...' })
});
const { nonce } = await nonceResponse.json();

// 2. Sign the nonce with your wallet
const message = `Sign this nonce to authenticate: ${nonce}`;
const signature = await wallet.signMessage(message);

// 3. Get JWT token
const authResponse = await fetch('/api/wallet-auth/verify-signature', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wallet: '0x...', signature })
});
const { token } = await authResponse.json();

// 4. Use token for authenticated requests
const apiResponse = await fetch('/api/protected-endpoint', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 2. Protecting API Routes

```typescript
import { withAuth, MiddlewarePresets } from '@/lib/middleware/auth-utils';

// Basic authentication
export const GET = withAuth(MiddlewarePresets.basicAuth(), async (request) => {
  // Your API logic here
  return NextResponse.json({ data: 'protected' });
});

// Premium endpoint with billing
export const POST = withAuth(MiddlewarePresets.premium('5000000000000000'), async (request) => {
  const walletAddress = request.wallet.address;
  // Process request - billing handled automatically
  return NextResponse.json({ result: 'processed', wallet: walletAddress });
});
```

## Middleware Presets

| Preset | Description | Rate Limit | Cost | Features |
|--------|-------------|------------|------|----------|
| `public()` | No authentication | None | Free | Public access |
| `basicAuth()` | Basic wallet auth | 30/min, 300/hr | Free | Authentication only |
| `premium()` | Premium API access | 60/min, 1000/hr | 0.001 ETH | Billing enabled |
| `admin()` | Admin endpoints | 100/min, 2000/hr | Free | Admin scope required |
| `aiEndpoint()` | AI processing | 10/min, 50/hr | 0.005 ETH | Heavy billing |
| `contractGated()` | Smart contract required | 20/min, 200/hr | Free | On-chain registration |

## API Endpoints

### Authentication Endpoints

- **POST** `/api/wallet-auth/request-nonce` - Request authentication nonce
- **POST** `/api/wallet-auth/verify-signature` - Verify signature and get JWT

### Wallet Management

- **GET** `/api/wallet-management` - Get usage stats and billing info
- **POST** `/api/wallet-management` - Add deposit to wallet balance

### Protected Endpoints

- **POST** `/api/ai-premium` - Premium AI endpoint (0.005 ETH per request)
- **POST** `/api/vector-memory-auth` - Authenticated vector memory (0.001 ETH per request)

## Smart Contract Integration

Deploy the `APIAccessRegistry.sol` contract for on-chain registration and billing:

```solidity
// Register with deposit
await contract.registerUser({ value: ethers.parseEther("0.011") }); // 0.01 ETH deposit + 0.001 ETH fee

// Add more funds
await contract.addDeposit({ value: ethers.parseEther("0.1") });

// Check registration
const isRegistered = await contract.isRegistered(walletAddress);
```

## Configuration

### Environment Variables

```bash
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters
ETHEREUM_RPC_URL=http://localhost:8545
API_ACCESS_CONTRACT_ADDRESS=0x... # Optional: for smart contract integration
```

### Custom Middleware Configuration

```typescript
import { createAuthMiddleware } from '@/lib/middleware/auth-middleware';

const customAuth = createAuthMiddleware({
  requireAuth: true,
  requiredScopes: ['dao:member', 'premium:user'],
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 50,
    requestsPerHour: 500,
  },
  billing: {
    enabled: true,
    costPerRequest: '2000000000000000', // 0.002 ETH
    requireDeposit: true,
  },
  smartContract: {
    requireRegistration: true,
    contractAddress: '0x...',
  },
});
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_REQUIRED` | Missing authorization header | 401 |
| `TOKEN_INVALID` | Invalid or expired JWT | 401 |
| `WALLET_INVALID` | Invalid wallet address | 401 |
| `SCOPE_INSUFFICIENT` | Missing required permissions | 403 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `BILLING_INSUFFICIENT` | Insufficient balance | 402 |
| `REGISTRATION_REQUIRED` | Not registered in smart contract | 403 |

## Response Headers

Authenticated requests include usage headers:

```
X-Wallet-Address: 0x742d35Cc6634C0532925a3b8D0F6be7734C2cD33
X-Request-Authenticated: true
X-RateLimit-Remaining-Minute: 29
X-RateLimit-Remaining-Hour: 299
```

## Usage Examples

### Frontend Integration

```typescript
class WalletAPI {
  private token: string | null = null;

  async authenticate(wallet: string, signer: any) {
    // Get nonce
    const { nonce } = await this.requestNonce(wallet);
    
    // Sign message
    const message = `Sign this nonce to authenticate: ${nonce}`;
    const signature = await signer.signMessage(message);
    
    // Get token
    const { token } = await this.verifySignature(wallet, signature);
    this.token = token;
    
    return token;
  }

  async callProtectedAPI(endpoint: string, data: any) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });

    if (response.status === 401) {
      // Token expired, re-authenticate
      throw new Error('Please re-authenticate');
    }

    return response.json();
  }
}
```

### Node.js Backend Integration

```typescript
import { createAuthMiddleware } from './lib/middleware/auth-middleware';

// Create custom middleware for your specific needs
const aiModelMiddleware = createAuthMiddleware({
  requireAuth: true,
  billing: {
    enabled: true,
    costPerRequest: ethers.parseEther("0.01").toString(),
    requireDeposit: true,
  },
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 5,
    requestsPerHour: 20,
  }
});

// Apply to your API routes
app.post('/api/heavy-ai-processing', aiModelMiddleware, (req, res) => {
  // Your heavy AI processing logic
  // Billing is handled automatically
});
```

## Production Considerations

1. **Replace In-Memory Storage**: Use Redis or a database for rate limiting and billing data
2. **Smart Contract Integration**: Deploy and configure the APIAccessRegistry contract
3. **Monitoring**: Add proper logging and metrics collection
4. **Security**: Implement additional security measures like IP whitelisting
5. **Backup**: Regular backups of user data and transaction history

## Development Setup

1. Install dependencies:
```bash
yarn add jsonwebtoken @types/jsonwebtoken
```

2. Generate JWT secret:
```bash
./scripts/setup-jwt-secret.sh
```

3. Start the development server:
```bash
yarn dev
```

## Testing

Test the authentication flow:

```bash
# Request nonce
curl -X POST http://localhost:3000/api/wallet-auth/request-nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b8D0F6be7734C2cD33"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/wallet-management \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

The system is now ready for production use with comprehensive wallet-based authentication, billing, and access control.