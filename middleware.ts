import { NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = new Set(['admin', 'staff']);

// ─── Security Headers ─────────────────────────────────────────────────────────

function buildCsp(nonce: string): string {
  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': `'self' 'nonce-${nonce}' https://js.stripe.com`,
    'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src': "'self' https://fonts.gstatic.com",
    'img-src': "'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
    'connect-src': `'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com`,
    'frame-src': "https://js.stripe.com https://hooks.stripe.com",
    'frame-ancestors': "'none'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'upgrade-insecure-requests': '',
  };

  return Object.entries(directives)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join('; ');
}

function applySecurityHeaders(res: NextResponse, nonce: string): void {
  res.headers.set('Content-Security-Policy', buildCsp(nonce));
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  res.headers.set('X-Nonce', nonce); // forwarded to layout for inline scripts
}

// ─── Admin route protection ───────────────────────────────────────────────────

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin') && !pathname.startsWith('/admin/layout');
}

// ─── Main middleware ──────────────────────────────────────────────────────────

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const { pathname } = req.nextUrl;

  // Skip middleware for static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple-touch-icon') ||
    /\.\w{2,4}$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  applySecurityHeaders(res, nonce);

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files.
     * Applying security headers to all routes ensures CSP, HSTS etc. are
     * consistently enforced regardless of which page the user hits first.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
