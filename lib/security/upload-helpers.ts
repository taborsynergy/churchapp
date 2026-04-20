const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const DANGEROUS_EXTENSIONS = new Set([
  'js', 'ts', 'php', 'html', 'htm', 'exe', 'sh', 'bat',
  'py', 'rb', 'pl', 'asp', 'aspx', 'jsp', 'cgi', 'svg',
]);

export function validateUploadedFile(
  filename: string,
  mimeType: string,
  size: number
): { valid: boolean; reason?: string } {
  if (!filename) return { valid: false, reason: 'Missing filename' };

  const parts = filename.toLowerCase().split('.');
  const ext = parts[parts.length - 1];

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, reason: `Disallowed extension: .${ext}` };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, reason: `Unsupported extension: .${ext}` };
  }

  if (size <= 0) {
    return { valid: false, reason: 'File is empty' };
  }

  return { valid: true };
}

export function sanitizeFileName(filename: string): string {
  if (!filename || typeof filename !== 'string') return '';
  const base = filename
    .replace(/^.*[/\\]/, '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return base;
}

export function isAllowedMimeType(mimeType: string, allowedTypes: string[]): boolean {
  if (!mimeType || typeof mimeType !== 'string') return false;
  return allowedTypes.includes(mimeType.toLowerCase());
}

export function isWithinSizeLimit(size: number, maxBytes: number): boolean {
  if (size <= 0) return false;
  return size <= maxBytes;
}
