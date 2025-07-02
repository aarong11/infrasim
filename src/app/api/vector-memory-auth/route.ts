import { NextRequest, NextResponse } from 'next/server';
import { withAuth, MiddlewarePresets, AuthenticatedRequest, getWalletAddress, AuthAPIResponse } from '../../../lib/middleware/auth-utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Apply middleware to the existing vector-memory route with premium billing
export const POST = withAuth(MiddlewarePresets.premium('1000000000000000'), async (request: AuthenticatedRequest) => {
  try {
    const { action, apiKeys, ...params } = await request.json();
    const walletAddress = getWalletAddress(request);
    
    // Log authenticated request
    console.log(`📥 Authenticated vector-memory request from wallet: ${walletAddress}`);
    
    // For demonstration, we'll simulate the vector memory operations
    // In a real implementation, you would integrate with your actual LangChainOrchestrator
    let result;
    switch (action) {
      case 'addCompany':
        // Simulate adding company to memory
        result = { 
          success: true, 
          id: `company_${Date.now()}`,
          message: 'Company added to authenticated vector memory'
        };
        break;

      case 'searchCompanies':
        // Simulate company search
        result = { 
          success: true, 
          results: [
            { id: 'comp1', name: 'Tech Corp', similarity: 0.95 },
            { id: 'comp2', name: 'AI Solutions', similarity: 0.87 }
          ],
          query: params.query
        };
        break;

      case 'generateChatResponse':
        // Simulate chat response generation
        result = { 
          success: true, 
          response: {
            text: `Authenticated AI response to: "${params.message}"`,
            model: params.chatModel || 'llama-4-maverick-17b-128e-instruct-fp8',
            timestamp: new Date().toISOString()
          }
        };
        break;

      default:
        return AuthAPIResponse.error(`Unsupported action: ${action}`, 'INVALID_ACTION', 400);
    }

    // Add billing info to response
    return AuthAPIResponse.success({
      ...result,
      walletAddress,
      billing: {
        cost: '0.001 ETH',
        action,
        note: 'Cost deducted from wallet balance'
      }
    });

  } catch (error) {
    console.error('Authenticated vector memory API error:', error);
    return AuthAPIResponse.error(
      error instanceof Error ? error.message : 'Unknown error',
      'PROCESSING_ERROR',
      500
    );
  }
});