import { NextRequest } from 'next/server';

// This API route has been removed as part of Ethereum infrastructure cleanup
// The DAO functionality will be re-implemented with a different approach
export async function GET() {
  return new Response('DAO contracts API temporarily unavailable during refactoring', {
    status: 503
  });
}