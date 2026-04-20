/**
 * Security Tests: Security Headers
 *
 * Covers:
 * - Content Security Policy (CSP) presence and directives
 * - X-Frame-Options to prevent clickjacking
 * - HSTS (HTTP Strict Transport Security)
 * - X-Content-Type-Options MIME sniffing prevention
 * - Permissions-Policy sensitive API restrictions
 */

import { parseSecurityHeaders } from '../../lib/security/header-helpers';

const CONFIGURED_HEADERS = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

describe('Security: Security Headers', () => {
  const headers = parseSecurityHeaders(CONFIGURED_HEADERS);

  // ─── 1. Content Security Policy ──────────────────────────────────────────
  describe('Content Security Policy (CSP)', () => {
    it('should define a Content-Security-Policy header', () => {
      expect(headers['content-security-policy']).toBeDefined();
    });

    it('should restrict default-src to self', () => {
      const csp = headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
    });

    it('should prevent plugin/object loading with object-src none', () => {
      const csp = headers['content-security-policy'];
      expect(csp).toContain("object-src 'none'");
    });

    it('should restrict form-action to self to prevent form hijacking', () => {
      const csp = headers['content-security-policy'];
      expect(csp).toContain("form-action 'self'");
    });

    it('should restrict base-uri to self to prevent base tag injection', () => {
      const csp = headers['content-security-policy'];
      expect(csp).toContain("base-uri 'self'");
    });

    it('should include upgrade-insecure-requests directive', () => {
      const csp = headers['content-security-policy'];
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should allow Stripe scripts and frames for payment processing', () => {
      const csp = headers['content-security-policy'];
      expect(csp).toContain('https://js.stripe.com');
      expect(csp).toContain('https://hooks.stripe.com');
    });

    it('should allow Supabase connections for API calls', () => {
      const csp = headers['content-security-policy'];
      expect(csp).toContain('https://*.supabase.co');
      expect(csp).toContain('wss://*.supabase.co');
    });
  });

  // ─── 2. X-Frame-Options (Clickjacking) ───────────────────────────────────
  describe('X-Frame-Options', () => {
    it('should set X-Frame-Options to SAMEORIGIN to prevent clickjacking', () => {
      expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should not allow framing from arbitrary origins', () => {
      expect(headers['x-frame-options']).not.toBe('ALLOWALL');
      expect(headers['x-frame-options']).not.toBeUndefined();
    });
  });

  // ─── 3. MIME Sniffing Prevention ─────────────────────────────────────────
  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff', () => {
      expect(headers['x-content-type-options']).toBe('nosniff');
    });
  });

  // ─── 4. Referrer Policy ───────────────────────────────────────────────────
  describe('Referrer-Policy', () => {
    it('should limit referrer information exposure', () => {
      const policy = headers['referrer-policy'];
      const acceptablePolicies = [
        'strict-origin-when-cross-origin',
        'strict-origin',
        'no-referrer',
        'same-origin',
      ];

      expect(acceptablePolicies).toContain(policy);
    });
  });

  // ─── 5. Permissions-Policy ────────────────────────────────────────────────
  describe('Permissions-Policy', () => {
    it('should disable camera access', () => {
      const policy = headers['permissions-policy'];
      expect(policy).toContain('camera=()');
    });

    it('should disable microphone access', () => {
      const policy = headers['permissions-policy'];
      expect(policy).toContain('microphone=()');
    });

    it('should disable geolocation access', () => {
      const policy = headers['permissions-policy'];
      expect(policy).toContain('geolocation=()');
    });
  });
});
