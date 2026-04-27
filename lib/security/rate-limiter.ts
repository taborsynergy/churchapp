/**
 * Server-side rate limiter using Supabase as the distributed store.
 * Works correctly across serverless cold starts and multiple instances.
 *
 * Falls back gracefully if the rate_limits table doesn't exist yet,
 * so it never blocks production if the migration is pending.
 */
import { createClient } from '@supabase/supabase-js';

const WINDOW_MS = 60_000; // 1-minute sliding window

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

/**
 * Checks and increments the rate limit counter for a given key.
 * @param key      Identifier string (e.g. IP address, user ID)
 * @param maxRequests  Max allowed requests in the window
 * @param windowMs     Window duration in milliseconds (default: 60s)
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs = WINDOW_MS
): Promise<RateLimitResult> {
  const db = svc();
  if (!db) {
    // If Supabase isn't configured, allow all requests (fail-open for availability)
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Count requests in the current window
    const { count } = await db
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('requested_at', new Date(windowStart).toISOString());

    const currentCount = count ?? 0;

    if (currentCount >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + windowMs,
      };
    }

    // Record this request
    await db.from('rate_limits').insert({ key, requested_at: new Date(now).toISOString() });

    // Prune old entries asynchronously (fire and forget)
    db.from('rate_limits')
      .delete()
      .lt('requested_at', new Date(windowStart).toISOString())
      .eq('key', key)
      .then(() => {});

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt: now + windowMs,
    };
  } catch {
    // Fail open — never block legitimate users due to rate limit infrastructure issues
    return { allowed: true, remaining: maxRequests, resetAt: now + windowMs };
  }
}

/**
 * Returns a NextResponse-compatible rate limit headers object.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}

// ─── Legacy in-process limiter (kept for non-critical local guards) ───────────
// NOTE: This is NOT suitable for production serverless — use checkRateLimit() above.
export class InProcessRateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private store = new Map<string, { count: number; firstRequest: number }>();

  constructor(options: { maxRequests: number; windowMs: number }) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /** Records one request for key. Call before isBlocked(). */
  record(key: string): void {
    const now = Date.now();
    const existing = this.store.get(key);
    if (!existing || now - existing.firstRequest > this.windowMs) {
      this.store.set(key, { count: 1, firstRequest: now });
    } else {
      existing.count += 1;
    }
  }

  /** Returns true if the key has exceeded maxRequests in the current window. */
  isBlocked(key: string): boolean {
    const now = Date.now();
    const existing = this.store.get(key);
    if (!existing) return false;
    if (now - existing.firstRequest > this.windowMs) {
      this.store.delete(key);
      return false;
    }
    return existing.count >= this.maxRequests;
  }

  /**
   * Back-dates the firstRequest timestamp by simulatedAgeMs so isBlocked()
   * sees the window as expired. Used in tests to simulate time passing.
   */
  resetExpired(key: string, simulatedAgeMs?: number): void {
    const existing = this.store.get(key);
    if (!existing) return;
    if (simulatedAgeMs !== undefined) {
      existing.firstRequest = Date.now() - simulatedAgeMs;
    } else {
      this.store.delete(key);
    }
  }

  /** Combined record+isBlocked in one call (legacy). Returns true if allowed. */
  check(key: string): boolean {
    this.record(key);
    return !this.isBlocked(key);
  }

  /** Call periodically to prevent unbounded Map growth. */
  prune(): void {
    const now = Date.now();
    for (const [key, record] of Array.from(this.store)) {
      if (now - record.firstRequest > this.windowMs) this.store.delete(key);
    }
  }
}

/** @deprecated Use checkRateLimit() for distributed serverless rate limiting. */
export { InProcessRateLimiter as RateLimiter };
