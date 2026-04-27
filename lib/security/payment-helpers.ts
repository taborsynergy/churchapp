import { createHmac, timingSafeEqual } from 'crypto';

const ALLOWED_PAYMENT_TYPES = new Set(['one_time', 'recurring']);
const CARD_FIELD_NAMES = new Set(['card_number', 'cvv', 'cvc', 'expiry', 'card_expiry', 'pan']);
const CARD_NUMBER_PATTERN = /^\d{13,19}$/;

/**
 * Validates a donation amount in dollars (whole or decimal, e.g. 25.00 = $25).
 * Min: $1.00 | Max: $100,000.00
 */
export function validateDonationAmount(amount: unknown): boolean {
  if (typeof amount !== 'number') return false;
  if (!Number.isFinite(amount)) return false;
  return amount >= 1 && amount <= 100_000;
}

export function validatePaymentType(type: string | null | undefined): boolean {
  if (!type || typeof type !== 'string') return false;
  return ALLOWED_PAYMENT_TYPES.has(type);
}

/**
 * Verifies a Stripe-style webhook signature using HMAC-SHA256.
 * The signature is expected in the format: "t=timestamp,v1=hex_signature"
 * Performs timing-safe comparison to prevent timing attacks.
 */
export function isValidWebhookSignature(
  signatureHeader: string | null | undefined,
  rawBody: string,
  secret: string | null | undefined
): boolean {
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') return false;
  if (!rawBody) return false;

  try {
    // Parse Stripe-format: "t=1234567890,v1=abc123..."
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => p.split('=') as [string, string])
    );
    const timestamp = parts['t'];
    const receivedSig = parts['v1'];
    if (!timestamp || !receivedSig) return false;

    // Reject stale webhooks (> 5 minutes old)
    const webhookAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (webhookAge > 300) return false;

    // Compute expected signature
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSig = createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Timing-safe comparison
    const expected = Buffer.from(expectedSig, 'hex');
    const received = Buffer.from(receivedSig, 'hex');
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
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
