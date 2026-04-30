/**
 * CSRF protection utilities.
 *
 * Strategy: Double-Submit Cookie pattern.
 * - Server generates a cryptographically random token.
 * - Token is set as an HttpOnly cookie AND returned to the client in a response header.
 * - Client sends the token in the X-CSRF-Token request header.
 * - Server compares the header value to the cookie value (timing-safe).
 *
 * For Next.js API routes that require Bearer token auth, CSRF is partially mitigated
 * because: (a) the Bearer token cannot be read by cross-origin JavaScript and
 * (b) form submissions don't send Authorization headers by default.
 * These helpers are provided for additional hardening of form-based state mutations.
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const CSRF_TOKEN_LENGTH = 32; // 256 bits
const CSRF_COOKIE_NAME = '__Host-csrf';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Generates a cryptographically random CSRF token.
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Returns the cookie options for the CSRF token.
 * __Host- prefix enforces Secure + no Domain + Path=/ (strongest cookie binding).
 */
export function csrfCookieOptions() {
  return {
    name: CSRF_COOKIE_NAME,
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60, // 1 hour
  };
}

/**
 * Timing-safe comparison of two CSRF token strings.
 */
export function validateCsrfToken(
  tokenFromHeader: string | null | undefined,
  tokenFromCookie: string | null | undefined
): boolean {
  if (!tokenFromHeader || !tokenFromCookie) return false;
  if (typeof tokenFromHeader !== 'string' || typeof tokenFromCookie !== 'string') return false;

  try {
    // Hash both to ensure equal-length Uint8Array buffers for timingSafeEqual
    const a = new Uint8Array(createHash('sha256').update(tokenFromHeader).digest());
    const b = new Uint8Array(createHash('sha256').update(tokenFromCookie).digest());
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Validates a redirect URL to prevent open redirect vulnerabilities.
 * Only allows relative paths or same-origin absolute URLs.
 */
export function isSafeRedirectUrl(url: string, baseOrigin?: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Relative paths are safe
  if (url.startsWith('/') && !url.startsWith('//')) return true;

  // Absolute URLs must match the app's origin
  try {
    const parsed = new URL(url);
    if (baseOrigin) {
      return parsed.origin === baseOrigin;
    }
    // If no baseOrigin provided, allow https or http://localhost (dev)
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Checks whether an Origin header value is in the allowed list.
 */
export function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin || typeof origin !== 'string') return false;
  return allowedOrigins.includes(origin);
}
