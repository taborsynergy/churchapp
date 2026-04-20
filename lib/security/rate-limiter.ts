interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  count: number;
  firstRequest: number;
}

export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private store: Map<string, RequestRecord> = new Map();

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  record(key: string): void {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing) {
      this.store.set(key, { count: 1, firstRequest: now });
      return;
    }

    if (now - existing.firstRequest > this.windowMs) {
      this.store.set(key, { count: 1, firstRequest: now });
      return;
    }

    existing.count += 1;
  }

  isBlocked(key: string): boolean {
    const record = this.store.get(key);
    if (!record) return false;
    return record.count >= this.maxRequests;
  }

  resetExpired(key: string, elapsedMs: number): void {
    const record = this.store.get(key);
    if (!record) return;
    if (elapsedMs > this.windowMs) {
      this.store.delete(key);
    }
  }
}
