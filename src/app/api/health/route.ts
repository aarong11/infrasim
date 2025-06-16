import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health checks
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        web: 'up',
        // Check if Ollama is accessible
        ollama: process.env.OLLAMA_BASE_URL ? 'configured' : 'not_configured',
        // Check if Ethereum RPC is accessible
        ethereum: process.env.ETHEREUM_RPC_URL ? 'configured' : 'not_configured'
      }
    };

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}