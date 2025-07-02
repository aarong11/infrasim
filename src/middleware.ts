import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip middleware for API routes, static files, setup page, and iframe requests
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/setup') ||
    request.nextUrl.pathname === '/favicon.ico' ||
    request.nextUrl.searchParams.get('iframe') === 'true'
  ) {
    return NextResponse.next();
  }

  // For now, let's disable the setup check to prevent redirect loops
  // The setup check will be handled by the client-side components instead
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - setup (setup page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|setup).*)',
  ],
};