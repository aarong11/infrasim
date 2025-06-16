import { NextRequest, NextResponse } from 'next/server';

// Server-side API keys (not exposed to frontend)
const SERVER_API_KEYS = {
  lambdaApiKey: process.env.LAMBDA_LABS_API_KEY || '',
};

// Lambda Labs API proxy to handle CORS issues
export async function POST(request: NextRequest) {
  try {
    const { apiKey, model, messages, temperature, max_tokens, stream, ...otherParams } = await request.json();
    
    // Use client-provided API key first, then fall back to server key
    const effectiveApiKey = apiKey || SERVER_API_KEYS.lambdaApiKey;
    
    console.log('🔧 Lambda proxy API key resolution:', {
      hasClientKey: !!apiKey,
      clientKeyLength: apiKey?.length || 0,
      hasServerKey: !!SERVER_API_KEYS.lambdaApiKey,
      serverKeyLength: SERVER_API_KEYS.lambdaApiKey?.length || 0,
      usingKey: effectiveApiKey ? 'available' : 'none',
      timestamp: new Date().toISOString()
    });

    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: 'Lambda Labs API key is required. Please configure it in settings or set LAMBDA_LABS_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    // Prepare the request to Lambda Labs API
    const lambdaRequest = {
      model: model || 'llama-4-maverick-17b-128e-instruct-fp8',
      messages: messages || [],
      temperature: temperature || 0.1,
      max_tokens: max_tokens || 2048,
      stream: stream || false,
      ...otherParams
    };

    console.log('🔄 Proxying request to Lambda Labs API', {
      model: lambdaRequest.model,
      messagesCount: lambdaRequest.messages.length,
      temperature: lambdaRequest.temperature,
      keySource: apiKey ? 'client' : 'server',
      timestamp: new Date().toISOString()
    });

    // Make request to Lambda Labs API
    const response = await fetch('https://api.lambda.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveApiKey}`,
        'User-Agent': 'InfraSim/1.0'
      },
      body: JSON.stringify(lambdaRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Lambda Labs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        keySource: apiKey ? 'client' : 'server',
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        { 
          error: `Lambda Labs API error: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('✅ Lambda Labs API response received', {
      model: data.model || 'unknown',
      usage: data.usage || {},
      keySource: apiKey ? 'client' : 'server',
      timestamp: new Date().toISOString()
    });

    // Return the response with proper CORS headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('❌ Lambda proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}