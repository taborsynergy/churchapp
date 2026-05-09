import { NextRequest, NextResponse } from 'next/server';

// NOTE: Supabase JS v2 stores sessions in localStorage (browser-only).
// Middleware runs server-side and cannot read localStorage.
// Auth protection is handled by:
//   - client-side useEffect guards in admin/layout.tsx
//   - Supabase Row Level Security policies on all tables
//   - API route requireAuth/requireAdmin checks in lib/api-auth.ts
//
// To enable edge-level session checks, migrate to @supabase/ssr (cookie storage).

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
