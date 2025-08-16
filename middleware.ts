import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Bypass static files and API routes
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/unlock') ||
    pathname.startsWith('/api/youtube') ||
    pathname.startsWith('/api/state') ||
    pathname.startsWith('/unlock') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt')
  ) {
    return NextResponse.next();
  }

  // Check cookie
  const access = request.cookies.get('access_granted');
  if (access?.value === 'true') {
    return NextResponse.next();
  }

  // Redirect to unlock page
  const url = request.nextUrl.clone();
  url.pathname = '/unlock';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/:path*',
};
