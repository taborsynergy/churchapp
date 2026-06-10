const SAFE_ERROR_MESSAGES = new Set([
  'Invalid amount. Must be between $1 and $100,000.',
  'Invalid payment type.',
  'Invalid or inactive fund.',
  'Missing required fields.',
  'Unauthorized.',
  'Not found.',
]);

const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'encrypted_password', 'secret', 'private_key', 'token', 'api_key', 'cvv', 'ssn', 'pin']);

export function maskPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  const last4 = digits.slice(-4);
  const masked = '*'.repeat(digits.length - 4) + last4;
  return masked;
}

export function isSafeErrorMessage(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  return SAFE_ERROR_MESSAGES.has(message);
}

export function redactSensitiveFields(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (k, v) =>
    SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v
  ));
}

export function stripPrivateUserFields(
  user: Record<string, unknown>,
  isOwnProfile: boolean
): Record<string, unknown> {
  const { address, phone, ...publicFields } = user as {
    address: unknown;
    phone: unknown;
    [key: string]: unknown;
  };
  if (isOwnProfile) {
    return { ...publicFields, address, phone };
  }
  return publicFields;
}
