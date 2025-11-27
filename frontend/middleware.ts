import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight Edge middleware to provide UX redirects based on server-side
// verified session. This middleware calls the backend /auth/verify endpoint and
// forwards the incoming cookies so the backend can read HttpOnly cookies.
// The middleware is intentionally minimal: backend API guards remain the
// authoritative enforcement mechanism.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next internals and static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/static') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Only run redirects for root path; keep middleware lightweight.
  if (pathname === '/') {
    try {
      // Forward the client's cookies so backend can read HttpOnly cookies
      const cookie = req.headers.get('cookie') || '';
      const resp = await fetch(`${API_BASE}/auth/verify`, {
        method: 'GET',
        headers: { cookie },
        // do not follow redirects from backend
        redirect: 'manual',
      });

      if (resp.ok) {
        const data = await resp.json();
        const role = data.role || 'user';
        if (role === 'admin') {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
        // default user landing
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    } catch (e) {
      // On any error, just continue to the landing page
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/'],
};
