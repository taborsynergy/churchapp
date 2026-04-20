/**
 * Security Tests: Rate Limiting / DoS
 *
 * Covers:
 * - API flooding detection
 * - Password reset abuse prevention
 * - Registration spam detection
 */

import { RateLimiter } from '../../lib/security/rate-limiter';

describe('Security: Rate Limiting / DoS', () => {
  // ─── 1. API Flooding Detection ────────────────────────────────────────────
  describe('API Flood Detection', () => {
    it('should block requests exceeding the per-IP limit within the time window', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });
      const ip = '192.168.1.100';

      for (let i = 0; i < 10; i++) {
        limiter.record(ip);
      }

      expect(limiter.isBlocked(ip)).toBe(true);
    });

    it('should allow requests below the rate limit threshold', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });
      const ip = '10.0.0.1';

      for (let i = 0; i < 5; i++) {
        limiter.record(ip);
      }

      expect(limiter.isBlocked(ip)).toBe(false);
    });

    it('should reset the counter after the time window expires', () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 100 });
      const ip = '10.0.0.2';

      for (let i = 0; i < 3; i++) {
        limiter.record(ip);
      }

      expect(limiter.isBlocked(ip)).toBe(true);

      limiter.resetExpired(ip, 200);

      expect(limiter.isBlocked(ip)).toBe(false);
    });
  });

  // ─── 2. Password Reset Abuse ──────────────────────────────────────────────
  describe('Password Reset Request Abuse', () => {
    it('should limit password reset requests to 3 per email per hour', () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 3_600_000 });
      const email = 'victim@church.org';

      limiter.record(email);
      limiter.record(email);
      limiter.record(email);

      expect(limiter.isBlocked(email)).toBe(true);
    });

    it('should allow first password reset request', () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 3_600_000 });
      const email = 'newuser@church.org';

      limiter.record(email);

      expect(limiter.isBlocked(email)).toBe(false);
    });
  });

  // ─── 3. Registration Spam Detection ──────────────────────────────────────
  describe('Registration Spam Prevention', () => {
    it('should detect multiple registrations from the same IP in a short window', () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 3_600_000 });
      const ip = '203.0.113.1';

      for (let i = 0; i < 5; i++) {
        limiter.record(ip);
      }

      expect(limiter.isBlocked(ip)).toBe(true);
    });

    it('should allow a normal user to register once', () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 3_600_000 });
      const ip = '198.51.100.1';

      limiter.record(ip);

      expect(limiter.isBlocked(ip)).toBe(false);
    });

    it('should track different IPs independently', () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 });

      limiter.record('1.2.3.4');
      limiter.record('1.2.3.4');

      limiter.record('5.6.7.8');

      expect(limiter.isBlocked('1.2.3.4')).toBe(true);
      expect(limiter.isBlocked('5.6.7.8')).toBe(false);
    });
  });
});
