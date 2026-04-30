/**
 * In-process rate limiter for use as a fallback when the DB store is unavailable.
 * Not distributed — does not survive process restarts or work across instances.
 * Use only as a degradation fallback inside rate-limiter.ts.
 */

interface BucketEntry {
  count: number;
  firstRequest: number;
}

export class InProcessRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, BucketEntry>();

  constructor(options: { maxRequests: number; windowMs: number }) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  record(key: string): void {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.firstRequest > this.windowMs) {
      this.store.set(key, { count: 1, firstRequest: now });
    } else {
      entry.count += 1;
    }
  }

  isBlocked(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry) return false;
    if (now - entry.firstRequest > this.windowMs) {
      this.store.delete(key);
      return false;
    }
    return entry.count >= this.maxRequests;
  }

  /** Record + check atomically. Returns true when the request is allowed. */
  check(key: string): boolean {
    this.record(key);
    return !this.isBlocked(key);
  }

  /**
   * Manually expire the bucket for `key` by backdating its firstRequest so it
   * falls outside the window. Used in tests to simulate time passing.
   * @param key  The rate-limit key to expire
   * @param ageMs  How many ms ago to place firstRequest (must exceed windowMs to unblock)
   */
  resetExpired(key: string, ageMs: number): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.firstRequest = Date.now() - ageMs;
    }
  }

  /** Remove expired buckets to prevent unbounded memory growth. */
  prune(): void {
    const now = Date.now();
    Array.from(this.store.entries()).forEach(([key, entry]) => {
      if (now - entry.firstRequest > this.windowMs) {
        this.store.delete(key);
      }
    });
  }
}
