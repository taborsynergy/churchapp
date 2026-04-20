/**
 * Security Tests: File Upload Security
 *
 * Covers:
 * - Script disguised as image (polyglot files)
 * - Path traversal in file name
 * - File size limit enforcement
 * - Allowed MIME type validation
 */

import {
  validateUploadedFile,
  sanitizeFileName,
  isAllowedMimeType,
  isWithinSizeLimit,
} from '../../lib/security/upload-helpers';

describe('Security: File Upload', () => {
  // ─── 1. Script Disguised as Image ────────────────────────────────────────
  describe('Script Disguised as Image (Polyglot Files)', () => {
    it('should reject a .js file regardless of claimed MIME type', () => {
      const fakeImageFile = {
        name: 'avatar.jpg.js',
        type: 'image/jpeg',
        size: 5000,
      };

      const result = validateUploadedFile(fakeImageFile.name, fakeImageFile.type, fakeImageFile.size);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('extension');
    });

    it('should reject a .php file uploaded as profile photo', () => {
      const phpFile = { name: 'shell.php', type: 'image/jpeg', size: 1000 };
      const result = validateUploadedFile(phpFile.name, phpFile.type, phpFile.size);
      expect(result.valid).toBe(false);
    });

    it('should reject an .html file disguised as a PNG', () => {
      const htmlFile = { name: 'index.html', type: 'image/png', size: 500 };
      const result = validateUploadedFile(htmlFile.name, htmlFile.type, htmlFile.size);
      expect(result.valid).toBe(false);
    });

    it('should accept a legitimate JPEG image', () => {
      const validImage = { name: 'profile.jpg', type: 'image/jpeg', size: 200_000 };
      const result = validateUploadedFile(validImage.name, validImage.type, validImage.size);
      expect(result.valid).toBe(true);
    });
  });

  // ─── 2. Path Traversal in File Name ──────────────────────────────────────
  describe('Path Traversal Prevention', () => {
    it('should strip path traversal sequences from file names', () => {
      const dangerous = '../../../etc/passwd.jpg';
      const sanitized = sanitizeFileName(dangerous);

      expect(sanitized).not.toContain('../');
      expect(sanitized).not.toContain('..\\');
      expect(sanitized).not.toContain('/etc/');
    });

    it('should strip absolute paths from file names', () => {
      const absolutePath = '/var/www/html/webshell.php';
      const sanitized = sanitizeFileName(absolutePath);

      expect(sanitized).not.toMatch(/^\//);
      expect(sanitized).not.toContain('/var/www/');
    });

    it('should preserve the base file name after sanitization', () => {
      const traversal = '../../../uploads/photo.jpg';
      const sanitized = sanitizeFileName(traversal);

      expect(sanitized).toBe('photo.jpg');
    });
  });

  // ─── 3. File Size Limit ───────────────────────────────────────────────────
  describe('File Size Limit Enforcement', () => {
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;

    it('should reject files exceeding the 5MB limit', () => {
      const oversized = MAX_SIZE_BYTES + 1;
      expect(isWithinSizeLimit(oversized, MAX_SIZE_BYTES)).toBe(false);
    });

    it('should accept files within the 5MB limit', () => {
      const validSize = 2 * 1024 * 1024;
      expect(isWithinSizeLimit(validSize, MAX_SIZE_BYTES)).toBe(true);
    });

    it('should reject zero-byte files', () => {
      expect(isWithinSizeLimit(0, MAX_SIZE_BYTES)).toBe(false);
    });
  });

  // ─── 4. Allowed MIME Types ────────────────────────────────────────────────
  describe('MIME Type Whitelist', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    it('should reject dangerous MIME types', () => {
      const dangerous = [
        'application/javascript',
        'text/html',
        'application/x-php',
        'application/octet-stream',
        'text/xml',
        'application/json',
      ];

      dangerous.forEach((mime) => {
        expect(isAllowedMimeType(mime, allowedTypes)).toBe(false);
      });
    });

    it('should accept allowed image MIME types', () => {
      allowedTypes.forEach((mime) => {
        expect(isAllowedMimeType(mime, allowedTypes)).toBe(true);
      });
    });
  });
});
