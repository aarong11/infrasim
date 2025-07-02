import { NextRequest, NextResponse } from 'next/server';
import { withAuth, MiddlewarePresets, AuthenticatedRequest, getWalletAddress, AuthAPIResponse } from '../../../lib/middleware/auth-utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Premium AI endpoint with billing - costs 0.005 ETH per request
 * POST /api/ai-premium
 */
export const POST = withAuth(MiddlewarePresets.aiEndpoint('5000000000000000'), async (request: AuthenticatedRequest) => {
  try {
    const { prompt, model = 'llama-4-maverick-17b-128e-instruct-fp8' } = await request.json();
    const walletAddress = getWalletAddress(request);
    
    if (!prompt || typeof prompt !== 'string') {
      return AuthAPIResponse.error('Valid prompt is required', 'INVALID_PROMPT', 400);
    }
    
    // Simulate AI processing (replace with actual AI service call)
    const response = await processAIRequest(prompt, model);
    
    return AuthAPIResponse.success({
      prompt,
      model,
      response,
      walletAddress,
      billing: {
        cost: '0.005 ETH',
        note: 'Amount has been deducted from your wallet balance'
      }
    });
    
  } catch (error) {
    console.error('Error processing AI request:', error);
    return AuthAPIResponse.error('Failed to process AI request', 'AI_ERROR', 500);
  }
});

// Simulate AI processing
async function processAIRequest(prompt: string, model: string) {
  // In a real implementation, this would call your AI service
  return {
    text: `AI Response to: "${prompt}" using model ${model}`,
    tokens: 150,
    processingTime: '2.3s',
    timestamp: new Date().toISOString()
  };
}