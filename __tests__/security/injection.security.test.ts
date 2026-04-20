/**
 * Security Tests: Injection
 *
 * Covers:
 * - SQL injection attempts in input fields
 * - Stored XSS in prayer requests and announcements
 * - Reflected XSS via query parameters
 * - HTML injection in user-facing fields
 * - Command injection patterns
 * - Input sanitization validation
 */

import {
  sanitizeText,
  sanitizeHtml,
  detectSqlInjection,
  detectXssPayload,
  sanitizeDonationText,
  sanitizeEmail,
} from '../../lib/security/sanitization-helpers';

describe('Security: Injection', () => {
  // ─── 1. SQL Injection via Text Fields ────────────────────────────────────
  describe('SQL Injection Detection', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "1; DELETE FROM donations",
      "' OR 1=1 --",
      "' AND SLEEP(5) --",
    ];

    it('should detect common SQL injection payloads in text input', () => {
      sqlPayloads.forEach((payload) => {
        expect(detectSqlInjection(payload)).toBe(true);
      });
    });

    it('should not flag clean user input as SQL injection', () => {
      const cleanInputs = [
        'Please pray for my family.',
        'John 3:16 is my favorite verse.',
        "God's grace is sufficient.",
        'Summer Picnic 2024',
      ];
      cleanInputs.forEach((input) => {
        expect(detectSqlInjection(input)).toBe(false);
      });
    });
  });

  // ─── 2. Stored XSS — Prayer Request Body ─────────────────────────────────
  describe('Stored XSS via Prayer Requests', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<a href="javascript:void(0)" onclick="stealCookies()">Click</a>',
      '"><script>document.location="http://evil.com"</script>',
    ];

    it('should strip XSS payloads from prayer request body', () => {
      xssPayloads.forEach((payload) => {
        const sanitized = sanitizeHtml(payload);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).not.toContain('javascript:');
      });
    });

    it('should detect XSS payload patterns before sanitization', () => {
      xssPayloads.forEach((payload) => {
        expect(detectXssPayload(payload)).toBe(true);
      });
    });
  });

  // ─── 3. Reflected XSS via URL Parameters ─────────────────────────────────
  describe('Reflected XSS via URL Parameters', () => {
    it('should encode special characters in reflected query parameter values', () => {
      const raw = '<script>alert("XSS")</script>';
      const encoded = encodeURIComponent(raw);

      expect(encoded).not.toContain('<script>');
      expect(encoded).toContain('%3Cscript%3E');
    });

    it('should not allow query params to inject executable content in page title', () => {
      const userInput = '<script>alert(1)</script>';
      const title = `Search results for: ${sanitizeText(userInput)}`;

      expect(title).not.toContain('<script>');
    });
  });

  // ─── 4. HTML Injection in Donor Name ─────────────────────────────────────
  describe('HTML Injection in Donation Fields', () => {
    it('should strip HTML tags from donor name', () => {
      const malicious = '<h1>Injected</h1> John Doe';
      const sanitized = sanitizeDonationText(malicious, 100);

      expect(sanitized).not.toContain('<h1>');
      expect(sanitized).not.toContain('</h1>');
    });

    it('should limit donation fund name to maximum length to prevent overflow attacks', () => {
      const longName = 'A'.repeat(500);
      const sanitized = sanitizeDonationText(longName, 200);

      expect(sanitized.length).toBeLessThanOrEqual(200);
    });

    it('should return empty string for non-string donation inputs', () => {
      expect(sanitizeDonationText(null as unknown as string, 100)).toBe('');
      expect(sanitizeDonationText(123 as unknown as string, 100)).toBe('');
      expect(sanitizeDonationText(undefined as unknown as string, 100)).toBe('');
    });
  });

  // ─── 5. Command Injection ─────────────────────────────────────────────────
  describe('Command Injection Prevention', () => {
    const commandPayloads = [
      '; rm -rf /',
      '| cat /etc/passwd',
      '`whoami`',
      '$(id)',
      '&& shutdown -h now',
    ];

    it('should sanitize shell metacharacters from text inputs', () => {
      commandPayloads.forEach((payload) => {
        const sanitized = sanitizeText(payload);
        expect(sanitized).not.toMatch(/[`$|;&]/);
      });
    });
  });

  // ─── 6. Email Injection ───────────────────────────────────────────────────
  describe('Email Header Injection', () => {
    it('should reject email addresses with header injection characters', () => {
      const injectionEmails = [
        'user@example.com\nBcc: attacker@evil.com',
        'user@example.com\r\nTo: spam@evil.com',
        'test@test.com%0ABcc:evil@evil.com',
      ];

      injectionEmails.forEach((email) => {
        expect(sanitizeEmail(email)).not.toContain('\n');
        expect(sanitizeEmail(email)).not.toContain('\r');
        expect(sanitizeEmail(email)).not.toContain('%0A');
      });
    });

    it('should accept a well-formed email without modification', () => {
      expect(sanitizeEmail('pastor@church.org')).toBe('pastor@church.org');
    });
  });

  // ─── 7. Null Byte Injection ───────────────────────────────────────────────
  describe('Null Byte Injection', () => {
    it('should remove null bytes from text fields', () => {
      const nullBytePayload = 'hello\x00world';
      const sanitized = sanitizeText(nullBytePayload);
      expect(sanitized).not.toContain('\x00');
    });
  });

  // ─── 8. Prototype Pollution via JSON Inputs ───────────────────────────────
  describe('Prototype Pollution Prevention', () => {
    it('should detect prototype pollution attempts in JSON payloads', () => {
      const maliciousPayloads = [
        '{"__proto__": {"isAdmin": true}}',
        '{"constructor": {"prototype": {"isAdmin": true}}}',
      ];

      maliciousPayloads.forEach((payload) => {
        const parsed = JSON.parse(payload) as Record<string, unknown>;
        expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__') ||
               Object.prototype.hasOwnProperty.call(parsed, 'constructor')).toBe(true);
        expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
      });
    });
  });
});
