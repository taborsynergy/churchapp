import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ─── Singleton clients ────────────────────────────────────────────────────────
// Module-level singletons reused across requests in the same serverless instance.
// Supabase client initialization is not free — it registers listeners and allocates.
// Lazy initialization avoids build-time errors when env vars aren't set.

let _anonClient: SupabaseClient | null = null;
let _adminClientInstance: SupabaseClient | null = null;

function anonClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _anonClient;
}

export function adminClient(): SupabaseClient {
  if (!_adminClientInstance) {
    _adminClientInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _adminClientInstance;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthSuccess = { ok: true; userId: string; role: string };
type AuthFailure = { ok: false; response: NextResponse };
export type AuthResult = AuthSuccess | AuthFailure;

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Resolves a Bearer token to a Supabase user ID.
 * Returns null if the token is missing, malformed, or expired.
 */
export async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user } } = await anonClient().auth.getUser(token);
  return user?.id ?? null;
}

/**
 * Looks up a user's role from church_users.
 * Returns null if the user has no profile row.
 */
export async function resolveRole(userId: string): Promise<string | null> {
  const { data } = await adminClient()
    .from('church_users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role ?? null;
}

/**
 * Resolves both userId and role in a single optimized call.
 * Uses the anon client to verify the JWT, then the admin client for the role lookup.
 */
async function resolveUserAndRole(
  authHeader: string | null
): Promise<{ userId: string; role: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const { data: { user } } = await anonClient().auth.getUser(token);
  if (!user?.id) return null;

  const { data } = await adminClient()
    .from('church_users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!data?.role) return null;
  return { userId: user.id, role: data.role };
}

// ─── Auth guards ──────────────────────────────────────────────────────────────

/**
 * Requires the caller to be an authenticated admin or staff member.
 */
export async function requireAdminOrStaff(authHeader: string | null): Promise<AuthResult> {
  const resolved = await resolveUserAndRole(authHeader);
  if (!resolved) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!['admin', 'staff'].includes(resolved.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId: resolved.userId, role: resolved.role };
}

/**
 * Requires the caller to be an authenticated admin only.
 */
export async function requireAdmin(authHeader: string | null): Promise<AuthResult> {
  const resolved = await resolveUserAndRole(authHeader);
  if (!resolved) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (resolved.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 }) };
  }
  return { ok: true, userId: resolved.userId, role: resolved.role };
}

/**
 * Requires the caller to be any authenticated user.
 */
export async function requireAuth(
  authHeader: string | null
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const userId = await resolveUserId(authHeader);
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true, userId };
}

// ─── MIME → extension map ─────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Validates an uploaded file's MIME type and size.
 * Magic byte verification is done at the call site after reading the buffer.
 */
export function validateImageFile(
  file: File
): { ok: true; ext: string } | { ok: false; response: NextResponse } {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Only image files are allowed (JPEG, PNG, WebP, GIF)' },
        { status: 400 }
      ),
    };
  }
  if (file.size > 5 * 1024 * 1024) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 }),
    };
  }
  return { ok: true, ext };
}
