import 'server-only';

/**
 * Distributed rate limiter using Supabase as the store.
 * Safe for serverless environments — works across cold starts and instances.
 *
 * Fail strategy:
 *   - `checkRateLimit` (general): fails OPEN so legitimate users are never blocked
 *     by infrastructure issues.
 *   - `checkRateLimitStrict` (admin/financial): fails CLOSED — better to reject
 *     a legitimate request than allow unlimited abuse when the store is down.
 */
import { createClient } from '@supabase/supabase-js';
import { InProcessRateLimiter } from './rate-limiter-in-process';

export { InProcessRateLimiter };
// Backward-compat alias used by existing tests
export { InProcessRateLimiter as RateLimiter };

const WINDOW_MS = 60_000; // 1-minute sliding window

// In-memory fallback for when the DB store is unavailable
const _fallback = new InProcessRateLimiter({ maxRequests: 10, windowMs: WINDOW_MS });

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

async function _check(
  key: string,
  maxRequests: number,
  windowMs: number,
  failOpen: boolean
): Promise<RateLimitResult> {
  const db = svc();
  const now = Date.now();

  if (!db) {
    // No DB configured — use in-process fallback with conservative limit
    _fallback.record(key);
    const allowed = !_fallback.isBlocked(key);
    return { allowed, remaining: allowed ? maxRequests - 1 : 0, resetAt: now + windowMs };
  }

  const windowStart = now - windowMs;

  try {
    const { count } = await db
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('requested_at', new Date(windowStart).toISOString());

    const currentCount = count ?? 0;

    if (currentCount >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt: now + windowMs };
    }

    await db.from('rate_limits').insert({ key, requested_at: new Date(now).toISOString() });

    // Prune old entries asynchronously (fire and forget)
    db.from('rate_limits')
      .delete()
      .lt('requested_at', new Date(windowStart).toISOString())
      .eq('key', key)
      .then(() => {});

    return { allowed: true, remaining: maxRequests - currentCount - 1, resetAt: now + windowMs };
  } catch {
    if (failOpen) {
      // Non-critical endpoint — allow through, log and move on
      console.warn('[rate-limiter] DB error; failing open for key:', key);
      return { allowed: true, remaining: maxRequests, resetAt: now + windowMs };
    }
    // Critical endpoint (admin, financial) — fail closed
    console.error('[rate-limiter] DB error; failing closed for key:', key);
    return { allowed: false, remaining: 0, resetAt: now + windowMs };
  }
}

/**
 * Standard rate limiter — fails OPEN on infrastructure errors.
 * Use for general-purpose endpoints where availability > security.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs = WINDOW_MS
): Promise<RateLimitResult> {
  return _check(key, maxRequests, windowMs, true);
}

/**
 * Strict rate limiter — fails CLOSED on infrastructure errors.
 * Use for admin, financial, and auth-sensitive endpoints.
 */
export async function checkRateLimitStrict(
  key: string,
  maxRequests: number,
  windowMs = WINDOW_MS
): Promise<RateLimitResult> {
  return _check(key, maxRequests, windowMs, false);
}

/**
 * Returns standard rate-limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}
