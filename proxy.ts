import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV !== 'production';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple-touch-icon') ||
    /\.\w{2,4}$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ── CSP nonce ──────────────────────────────────────────────────────────────
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(Array.from(nonceBytes, (b) => String.fromCharCode(b)).join(''));

  // nonce kept for future use but strict-dynamic removed — Next.js inline scripts
  // don't receive the nonce via context, so strict-dynamic breaks the app in prod.
  const scriptSrc = `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://js.stripe.com https://browser.sentry-cdn.com`;

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.razorpay.com https://bible-api.com https://accounts.google.com https://oauth2.googleapis.com https://sentry.io https://*.sentry.io ws://localhost:* http://localhost:*",
    "worker-src blob: 'self'",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://api.razorpay.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Nonce', nonce);
  if (!isDev) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
