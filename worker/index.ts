import { NextRequest } from 'next/server';

// Import the API route handler from Next.js
import { POST as vectorMemoryHandler } from '../src/app/api/vector-memory/route';

// Worker fetch handler
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    
    // Route API calls to the appropriate Next.js handlers
    if (url.pathname.startsWith('/api/vector-memory')) {
      try {
        // Create a NextRequest-compatible object
        const nextRequest = new NextRequest(request);
        
        // Set environment variables from Cloudflare env
        if (env.LAMBDA_LABS_API_KEY) {
          process.env.LAMBDA_LABS_API_KEY = env.LAMBDA_LABS_API_KEY;
        }
        if (env.OPENAI_API_KEY) {
          process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
        }
        if (env.ANTHROPIC_API_KEY) {
          process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
        }
        
        // Call the Next.js API handler
        return await vectorMemoryHandler(nextRequest);
      } catch (error) {
        console.error('Worker API error:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), 
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        worker: 'infrasim-api'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Fallback for unmatched routes
    return new Response('Not Found', { status: 404 });
  },
};