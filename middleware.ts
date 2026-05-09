import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PROTECTED_PREFIXES = ['/admin', '/profile', '/onboarding'];
const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Read Supabase session from cookie
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Get the access token from the sb-* cookie Supabase sets
  const cookieHeader = req.headers.get('cookie') ?? '';
  const tokenMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
  const rawToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

  let session: { user: { id: string; email?: string } } | null = null;
  if (rawToken) {
    try {
      const parsed = JSON.parse(rawToken);
      const accessToken = Array.isArray(parsed) ? parsed[0] : parsed?.access_token;
      if (accessToken) {
        const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data } = await sb.auth.getUser(accessToken);
        if (data.user) session = { user: data.user };
      }
    } catch {
      // malformed cookie — treat as unauthenticated
    }
  }

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/onboarding/:path*'],
};
