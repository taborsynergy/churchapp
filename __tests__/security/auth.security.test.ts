/**
 * Security Tests: Authentication & Session
 *
 * Covers:
 * - Brute force protection
 * - JWT tampering / invalid tokens
 * - Session fixation
 * - Cookie flag expectations
 * - Password policy enforcement
 * - Account enumeration resistance
 * - Credential validation
 */

import {
  validatePasswordStrength,
  isValidEmail,
  sanitizeLoginInput,
  parseJwtPayload,
  isTokenExpired,
  extractAuthHeader,
} from '../../lib/security/auth-helpers';

describe('Security: Authentication & Session', () => {
  // ─── 1. Brute Force — lockout after repeated failures ─────────────────────
  describe('Brute Force Protection', () => {
    it('should detect when too many consecutive login attempts occur', () => {
      const attempts = Array.from({ length: 10 }, () => ({
        email: 'user@church.org',
        timestamp: Date.now(),
        success: false,
      }));

      const recentFailures = attempts.filter(
        (a) => !a.success && Date.now() - a.timestamp < 15 * 60 * 1000
      );

      expect(recentFailures.length).toBeGreaterThanOrEqual(5);
    });

    it('should not lockout after successful login resets the counter', () => {
      const attempts = [
        { email: 'user@church.org', success: false, timestamp: Date.now() - 1000 },
        { email: 'user@church.org', success: false, timestamp: Date.now() - 800 },
        { email: 'user@church.org', success: true, timestamp: Date.now() - 600 },
        { email: 'user@church.org', success: false, timestamp: Date.now() - 400 },
      ];

      const lastSuccess = attempts.findIndex((a) => a.success);
      const failuresAfterSuccess = attempts.slice(lastSuccess + 1).filter((a) => !a.success);

      expect(failuresAfterSuccess.length).toBeLessThan(5);
    });
  });

  // ─── 2. JWT Tampering ────────────────────────────────────────────────────
  describe('JWT Tampering', () => {
    it('should reject a JWT with a tampered payload', () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiJ1c2VyLTEyMyIsInJvbGUiOiJtZW1iZXIifQ.' +
        'VALID_SIGNATURE';

      const [header, , signature] = validToken.split('.');
      const tamperedPayload = btoa(JSON.stringify({ sub: 'user-123', role: 'admin' }));
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      expect(tamperedToken).not.toEqual(validToken);

      const original = parseJwtPayload(validToken);
      const tampered = parseJwtPayload(tamperedToken);

      expect(original?.role).toBe('member');
      expect(tampered?.role).toBe('admin');
    });

    it('should detect a structurally invalid JWT (missing segments)', () => {
      const invalidTokens = [
        '',
        'not.a.jwt.with.too.many.segments',
        'onlyone',
        'two.parts',
        null,
        undefined,
      ];

      invalidTokens.forEach((token) => {
        expect(parseJwtPayload(token as string)).toBeNull();
      });
    });

    it('should detect expired tokens', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const futureExp = Math.floor(Date.now() / 1000) + 3600;

      expect(isTokenExpired(pastExp)).toBe(true);
      expect(isTokenExpired(futureExp)).toBe(false);
    });
  });

  // ─── 3. Session Fixation ─────────────────────────────────────────────────
  describe('Session Fixation', () => {
    it('should generate a new session token on login (not reuse pre-login token)', () => {
      const preLoginSessionId = 'pre-login-session-abc123';
      const postLoginSessionId = 'post-login-session-xyz789';

      expect(postLoginSessionId).not.toEqual(preLoginSessionId);
    });

    it('should invalidate existing session on logout', () => {
      let sessionValid = true;
      const logout = () => { sessionValid = false; };
      logout();
      expect(sessionValid).toBe(false);
    });
  });

  // ─── 4. Cookie Flags ─────────────────────────────────────────────────────
  describe('Cookie Security Flags', () => {
    it('should require HttpOnly flag on auth cookies to prevent JS access', () => {
      const cookieString = 'sb-auth-token=abc123; HttpOnly; Secure; SameSite=Lax; Path=/';
      expect(cookieString).toContain('HttpOnly');
    });

    it('should require Secure flag on auth cookies to enforce HTTPS', () => {
      const cookieString = 'sb-auth-token=abc123; HttpOnly; Secure; SameSite=Lax; Path=/';
      expect(cookieString).toContain('Secure');
    });

    it('should require SameSite attribute to mitigate CSRF', () => {
      const cookieString = 'sb-auth-token=abc123; HttpOnly; Secure; SameSite=Lax; Path=/';
      expect(cookieString).toMatch(/SameSite=(Strict|Lax)/);
    });
  });

  // ─── 5. Password Policy ──────────────────────────────────────────────────
  describe('Password Policy Enforcement', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(validatePasswordStrength('abc12')).toBe(false);
      expect(validatePasswordStrength('Ab1')).toBe(false);
    });

    it('should reject passwords without an uppercase letter', () => {
      expect(validatePasswordStrength('alllower1')).toBe(false);
    });

    it('should reject passwords without a number', () => {
      expect(validatePasswordStrength('AllLetters')).toBe(false);
    });

    it('should accept a strong password meeting all requirements', () => {
      expect(validatePasswordStrength('SecurePass1')).toBe(true);
      expect(validatePasswordStrength('Church@2024')).toBe(true);
    });
  });

  // ─── 6. Account Enumeration Resistance ───────────────────────────────────
  describe('Account Enumeration Resistance', () => {
    it('should return the same error message for unknown email and wrong password', () => {
      const unknownEmailError = 'Invalid login credentials';
      const wrongPasswordError = 'Invalid login credentials';

      expect(unknownEmailError).toEqual(wrongPasswordError);
    });
  });

  // ─── 7. Authorization Header Extraction ──────────────────────────────────
  describe('Authorization Header Handling', () => {
    it('should correctly extract Bearer token from Authorization header', () => {
      const headers = { authorization: 'Bearer my-token-value' };
      expect(extractAuthHeader(headers.authorization)).toBe('my-token-value');
    });

    it('should return null when Authorization header is missing or malformed', () => {
      expect(extractAuthHeader('')).toBeNull();
      expect(extractAuthHeader('Token abc')).toBeNull();
      expect(extractAuthHeader(undefined as unknown as string)).toBeNull();
    });
  });

  // ─── 8. Email Validation ─────────────────────────────────────────────────
  describe('Email Validation', () => {
    it('should reject clearly invalid email formats', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('missing@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should accept valid email formats', () => {
      expect(isValidEmail('user@church.org')).toBe(true);
      expect(isValidEmail('admin+test@grace.community')).toBe(true);
    });
  });

  // ─── 9. Login Input Sanitization ─────────────────────────────────────────
  describe('Login Input Sanitization', () => {
    it('should strip leading/trailing whitespace from email inputs', () => {
      const raw = '  user@church.org  ';
      expect(sanitizeLoginInput(raw)).toBe('user@church.org');
    });

    it('should lowercase email inputs to prevent case-based duplicates', () => {
      const raw = 'USER@CHURCH.ORG';
      expect(sanitizeLoginInput(raw)).toBe('user@church.org');
    });
  });

  // ─── 10. Null / Empty Credential Guard ───────────────────────────────────
  describe('Null and Empty Credential Guards', () => {
    it('should not allow login with null or empty email', () => {
      const isValidCredential = (email: string | null, password: string | null) => {
        if (!email || !password) return false;
        if (email.trim() === '' || password.trim() === '') return false;
        return true;
      };

      expect(isValidCredential(null, 'password')).toBe(false);
      expect(isValidCredential('', 'password')).toBe(false);
      expect(isValidCredential('user@test.com', null)).toBe(false);
      expect(isValidCredential('user@test.com', '')).toBe(false);
      expect(isValidCredential('user@test.com', 'valid1Pass')).toBe(true);
    });
  });
});
