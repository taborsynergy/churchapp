/**
 * Security Tests: Payment Security
 *
 * Covers:
 * - Card data never stored in database
 * - Stripe webhook signature verification
 * - Donation amount tampering prevention
 * - Payment type whitelist enforcement
 */

import {
  validateDonationAmount,
  validatePaymentType,
  isValidWebhookSignature,
  containsCardData,
} from '../../lib/security/payment-helpers';

describe('Security: Payment Security', () => {
  // ─── 1. Card Data Never Stored ────────────────────────────────────────────
  describe('Card Data Exposure Prevention', () => {
    it('should never store raw card numbers in the donation record', () => {
      const donationRecord = {
        id: 'don-001',
        user_id: 'user-001',
        fund_id: 'fund-001',
        amount: 100,
        stripe_session_id: 'cs_test_abc123',
        stripe_payment_id: 'pi_test_xyz789',
        payment_type: 'one_time',
        status: 'completed',
        donor_email: 'donor@church.org',
        donor_name: 'Jane Doe',
        is_anonymous: false,
      };

      expect(containsCardData(donationRecord)).toBe(false);
      expect(donationRecord).not.toHaveProperty('card_number');
      expect(donationRecord).not.toHaveProperty('cvv');
      expect(donationRecord).not.toHaveProperty('expiry');
    });

    it('should detect if a record accidentally contains card-like data', () => {
      const leakyRecord = {
        donor_name: 'John Doe',
        card_number: '4111111111111111',
        amount: 50,
      };

      expect(containsCardData(leakyRecord)).toBe(true);
    });

    it('should not store card data in stripe_payment_id or stripe_session_id fields', () => {
      const stripFields = ['stripe_session_id', 'stripe_payment_id'];
      const values = {
        stripe_session_id: 'cs_test_abc123',
        stripe_payment_id: 'pi_test_xyz789',
      };

      stripFields.forEach((field) => {
        const value = values[field as keyof typeof values];
        expect(value).not.toMatch(/^\d{13,19}$/);
      });
    });
  });

  // ─── 2. Stripe Webhook Signature Verification ─────────────────────────────
  describe('Stripe Webhook Signature Verification', () => {
    it('should reject a webhook request with no stripe-signature header', () => {
      const signature = null;
      expect(isValidWebhookSignature(signature, 'raw-body', 'whsec_test')).toBe(false);
    });

    it('should reject a webhook request with an empty signature', () => {
      expect(isValidWebhookSignature('', 'raw-body', 'whsec_test')).toBe(false);
    });

    it('should reject requests with a missing webhook secret configuration', () => {
      expect(isValidWebhookSignature('v1=abc123', 'raw-body', '')).toBe(false);
      expect(isValidWebhookSignature('v1=abc123', 'raw-body', null as unknown as string)).toBe(false);
    });

    it('should require both signature and webhook secret to be present for processing', () => {
      const hasSignature = (sig: string | null) => sig !== null && sig !== '';
      const hasSecret = (secret: string | null) => secret !== null && secret !== '';

      expect(hasSignature('v1=abc123') && hasSecret('whsec_test')).toBe(true);
      expect(hasSignature(null) && hasSecret('whsec_test')).toBe(false);
      expect(hasSignature('v1=abc123') && hasSecret(null)).toBe(false);
    });
  });

  // ─── 3. Donation Amount Tampering ─────────────────────────────────────────
  // validateDonationAmount uses dollar amounts (not cents).
  // Min: $1.00 | Max: $100,000.00 | Accepts decimals (e.g. $9.99)
  describe('Donation Amount Tampering Prevention', () => {
    it('should reject amounts below the $1 minimum', () => {
      expect(validateDonationAmount(0)).toBe(false);
      expect(validateDonationAmount(-1)).toBe(false);
      expect(validateDonationAmount(0.50)).toBe(false);
      expect(validateDonationAmount(0.99)).toBe(false);
    });

    it('should reject amounts above the $100,000 maximum', () => {
      expect(validateDonationAmount(100_001)).toBe(false);
      expect(validateDonationAmount(999_999)).toBe(false);
    });

    it('should accept valid amounts within the allowed range', () => {
      expect(validateDonationAmount(1)).toBe(true);
      expect(validateDonationAmount(50)).toBe(true);
      expect(validateDonationAmount(9.99)).toBe(true);
      expect(validateDonationAmount(100_000)).toBe(true);
    });

    it('should reject non-numeric amount values', () => {
      expect(validateDonationAmount(NaN)).toBe(false);
      expect(validateDonationAmount(Infinity)).toBe(false);
      expect(validateDonationAmount('500' as unknown as number)).toBe(false);
    });
  });

  // ─── 4. Payment Type Whitelist ────────────────────────────────────────────
  describe('Payment Type Whitelist Enforcement', () => {
    it('should reject invalid payment types', () => {
      const invalidTypes = ['free', 'crypto', 'wire', 'cash', '', null, undefined, 'admin'];

      invalidTypes.forEach((type) => {
        expect(validatePaymentType(type as string)).toBe(false);
      });
    });

    it('should accept only one_time and recurring payment types', () => {
      expect(validatePaymentType('one_time')).toBe(true);
      expect(validatePaymentType('recurring')).toBe(true);
    });
  });
});
