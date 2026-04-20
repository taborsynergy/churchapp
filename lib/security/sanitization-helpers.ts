const SQL_PATTERNS = [
  /'\s*OR\s*'?\d*'?\s*=\s*'?\d*/i,
  /'\s*;?\s*(DROP|DELETE|UPDATE|INSERT|SELECT|UNION)\s/i,
  /UNION\s+SELECT/i,
  /--/,
  /'\s*AND\s+SLEEP\s*\(/i,
  /'\s*AND\s+\d+\s*=\s*\d+/i,
  /admin\s*'--/i,
  /;\s*(DROP|DELETE|UPDATE|INSERT)\s/i,
  /'\s*OR\s+\d+\s*=\s*\d+/i,
  /1\s*;\s*(DELETE|DROP)\s/i,
];

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /onclick\s*=/i,
  /javascript\s*:/i,
  /<svg[\s>]/i,
  /<img[^>]+onerror/i,
];

const SHELL_META = /[`$|;&]/g;
const NULL_BYTE = /\x00/g;

export function detectSqlInjection(input: string): boolean {
  if (typeof input !== 'string') return false;
  return SQL_PATTERNS.some((p) => p.test(input));
}

export function detectXssPayload(input: string): boolean {
  if (typeof input !== 'string') return false;
  return XSS_PATTERNS.some((p) => p.test(input));
}

export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*?(onerror|onload|onclick|javascript)[^>]*?>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<svg[\s\S]*?>/gi, '')
    .replace(/<[^>]+>/g, '');
}

export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]+>/g, '')
    .replace(SHELL_META, '')
    .replace(NULL_BYTE, '')
    .trim();
}

export function sanitizeDonationText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return email
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .replace(/%0A/gi, '')
    .replace(/%0D/gi, '')
    .trim();
}
