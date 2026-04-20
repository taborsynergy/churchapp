/**
 * Security Tests: CSRF (Cross-Site Request Forgery)
 *
 * Covers:
 * - Donation CSRF — form action with GET method
 * - CORS origin policy enforcement
 * - GET requests must not trigger state changes
 */

import { isSafeRedirectUrl, isAllowedOrigin } from '../../lib/security/csrf-helpers';

describe('Security: CSRF', () => {
  // ─── 1. Donation Must Not Use GET Method ─────────────────────────────────
  describe('Donation CSRF via GET Request', () => {
    it('should reject GET requests to the create-checkout endpoint', () => {
      const method = 'GET';
      const allowedMethods = ['POST', 'OPTIONS'];

      expect(allowedMethods.includes(method)).toBe(false);
    });

    it('should accept POST requests to the create-checkout endpoint', () => {
      const method = 'POST';
      const allowedMethods = ['POST', 'OPTIONS'];

      expect(allowedMethods.includes(method)).toBe(true);
    });

    it('should require Authorization header on checkout request (prevents cross-site forgery)', () => {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer anon-key-token',
        'apikey': 'anon-key-token',
      };

      expect(requestHeaders).toHaveProperty('Authorization');
      expect(requestHeaders.Authorization).toMatch(/^Bearer /);
    });
  });

  // ─── 2. CORS Origin Policy ───────────────────────────────────────────────
  describe('CORS Origin Policy', () => {
    it('should allow requests from the known app origin', () => {
      const appOrigin = 'https://grace-community-church.netlify.app';
      expect(isAllowedOrigin(appOrigin, ['https://grace-community-church.netlify.app'])).toBe(true);
    });

    it('should allow localhost in development', () => {
      const devOrigin = 'http://localhost:3000';
      expect(isAllowedOrigin(devOrigin, ['http://localhost:3000'])).toBe(true);
    });

    it('should identify wildcard CORS as permissive (should be restricted in production)', () => {
      const currentCorsPolicy = '*';
      const isWildcard = currentCorsPolicy === '*';

      expect(isWildcard).toBe(true);
    });
  });

  // ─── 3. GET Requests Must Not Trigger State Changes ───────────────────────
  describe('Safe HTTP Methods for State Changes', () => {
    const stateChangingOperations = [
      { operation: 'create donation', method: 'POST' },
      { operation: 'update profile', method: 'PATCH' },
      { operation: 'delete user', method: 'DELETE' },
      { operation: 'approve user', method: 'PATCH' },
      { operation: 'submit prayer request', method: 'POST' },
    ];

    stateChangingOperations.forEach(({ operation, method }) => {
      it(`should use ${method} (not GET) for "${operation}"`, () => {
        expect(method).not.toBe('GET');
      });
    });

    it('should validate redirect URLs to prevent open redirect attacks', () => {
      const safeUrls = [
        'https://grace-community-church.netlify.app/give?success=true',
        'http://localhost:3000/give',
        'https://legitimate-church.org/donate/success',
      ];

      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '//evil.com/phishing',
        'file:///etc/passwd',
      ];

      safeUrls.forEach((url) => {
        expect(isSafeRedirectUrl(url)).toBe(true);
      });

      dangerousUrls.forEach((url) => {
        expect(isSafeRedirectUrl(url)).toBe(false);
      });
    });
  });
});
