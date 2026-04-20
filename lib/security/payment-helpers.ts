const ALLOWED_PAYMENT_TYPES = new Set(['one_time', 'recurring']);
const CARD_FIELD_NAMES = new Set(['card_number', 'cvv', 'cvc', 'expiry', 'card_expiry', 'pan']);
const CARD_NUMBER_PATTERN = /^\d{13,19}$/;

export function validateDonationAmount(amount: unknown): boolean {
  if (typeof amount !== 'number') return false;
  if (!Number.isFinite(amount)) return false;
  if (!Number.isInteger(amount)) return false;
  return amount >= 100 && amount <= 10_000_000;
}

export function validatePaymentType(type: string | null | undefined): boolean {
  if (!type || typeof type !== 'string') return false;
  return ALLOWED_PAYMENT_TYPES.has(type);
}

export function isValidWebhookSignature(
  signature: string | null | undefined,
  body: string,
  secret: string | null | undefined
): boolean {
  if (!signature || typeof signature !== 'string' || signature.trim() === '') return false;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') return false;
  if (!body) return false;
  return true;
}

export function containsCardData(record: Record<string, unknown>): boolean {
  for (const key of Object.keys(record)) {
    if (CARD_FIELD_NAMES.has(key.toLowerCase())) return true;
    const value = record[key];
    if (typeof value === 'string' && CARD_NUMBER_PATTERN.test(value.replace(/\s/g, ''))) {
      return true;
    }
  }
  return false;
}
