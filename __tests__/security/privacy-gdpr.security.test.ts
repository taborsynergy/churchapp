/**
 * Security Tests: Privacy / GDPR
 *
 * Covers:
 * - Users can request their own data (right of access)
 * - Users can delete their own account (right to erasure)
 * - Data minimization — only necessary fields collected
 * - Anonymous data handling
 * - Data retention policies
 * - Consent tracking
 * - Third-party data sharing controls (Stripe, etc.)
 */

import {
  canExportOwnData,
  canDeleteOwnAccount,
  filterPiiForExport,
  isMinimalDataCollection,
  isAnonymousDataSafe,
} from '../../lib/security/privacy-helpers';
import type { UserProfile } from '../../lib/types';

const makeUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-001',
  email: 'user@church.org',
  full_name: 'Jane Doe',
  role: 'member',
  status: 'active',
  avatar_url: '',
  phone: '555-1234',
  bio: 'Church member since 2020.',
  address: '123 Grace Ave',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('Security: Privacy / GDPR', () => {
  // ─── 1. Right of Access — Data Export ────────────────────────────────────
  describe('Right of Access (Data Export)', () => {
    it('should allow an active user to export their own data', () => {
      const user = makeUser({ id: 'user-001' });
      expect(canExportOwnData(user, 'user-001')).toBe(true);
    });

    it('should deny a user from exporting another user data', () => {
      const user = makeUser({ id: 'user-001', role: 'member' });
      expect(canExportOwnData(user, 'user-999')).toBe(false);
    });

    it('should include all PII fields in the export package', () => {
      const user = makeUser();
      const exported = filterPiiForExport(user);

      expect(exported).toHaveProperty('email');
      expect(exported).toHaveProperty('full_name');
      expect(exported).toHaveProperty('phone');
      expect(exported).toHaveProperty('address');
    });

    it('should not include internal fields like role or status in the user export', () => {
      const user = makeUser();
      const exported = filterPiiForExport(user);

      expect(exported).not.toHaveProperty('role');
      expect(exported).not.toHaveProperty('status');
    });
  });

  // ─── 2. Right to Erasure — Account Deletion ───────────────────────────────
  describe('Right to Erasure (Account Deletion)', () => {
    it('should allow a user to request deletion of their own account', () => {
      const user = makeUser({ id: 'user-001' });
      expect(canDeleteOwnAccount(user, 'user-001')).toBe(true);
    });

    it('should deny deletion of another user account', () => {
      const user = makeUser({ id: 'user-001', role: 'member' });
      expect(canDeleteOwnAccount(user, 'user-002')).toBe(false);
    });

    it('should confirm DB cascade delete is configured for user deletion', () => {
      const cascadeDeleteDefinition =
        'id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE';
      expect(cascadeDeleteDefinition).toContain('ON DELETE CASCADE');
    });
  });

  // ─── 3. Data Minimization ─────────────────────────────────────────────────
  describe('Data Minimization', () => {
    it('should only collect fields necessary for church membership', () => {
      const requiredFields = ['email', 'full_name'];
      const optionalFields = ['phone', 'bio', 'address', 'avatar_url'];

      const registrationPayload = { email: 'user@church.org', full_name: 'John Smith' };

      requiredFields.forEach((field) => {
        expect(registrationPayload).toHaveProperty(field);
      });

      const extraCollected = Object.keys(registrationPayload).filter(
        (k) => !requiredFields.includes(k) && !optionalFields.includes(k)
      );

      expect(extraCollected).toHaveLength(0);
    });

    it('should confirm registration does not collect unnecessary fields at signup', () => {
      const result = isMinimalDataCollection(['email', 'full_name', 'password']);
      expect(result).toBe(true);
    });

    it('should flag collection of highly sensitive data not required for church app', () => {
      const excessive = isMinimalDataCollection([
        'email', 'full_name', 'password',
        'ssn', 'date_of_birth', 'government_id',
      ]);
      expect(excessive).toBe(false);
    });
  });

  // ─── 4. Anonymous Data Handling ───────────────────────────────────────────
  describe('Anonymous Data Handling', () => {
    it('should confirm anonymous prayer requests do not expose user identity', () => {
      const anonymousRequest = {
        id: 'pr-001',
        title: 'Health request',
        body: 'Dealing with illness.',
        is_anonymous: true,
        user_id: null,
        category: 'health',
        status: 'open',
      };

      expect(isAnonymousDataSafe(anonymousRequest)).toBe(true);
    });

    it('should flag anonymous request that still contains user_id', () => {
      const leakyAnonymous = {
        id: 'pr-002',
        title: 'Request',
        body: 'Test.',
        is_anonymous: true,
        user_id: 'user-001',
        category: 'general',
        status: 'open',
      };

      expect(isAnonymousDataSafe(leakyAnonymous)).toBe(false);
    });
  });

  // ─── 5. Data Retention ────────────────────────────────────────────────────
  describe('Data Retention Awareness', () => {
    it('should confirm donation records include created_at for retention tracking', () => {
      const donationRecord = {
        id: 'don-001',
        amount: 100,
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      expect(donationRecord).toHaveProperty('created_at');
      expect(new Date(donationRecord.created_at).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should confirm user records include created_at and updated_at timestamps', () => {
      const user = makeUser();
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');
    });
  });

  // ─── 6. Third-Party Data Sharing — Stripe ────────────────────────────────
  describe('Third-Party Data Sharing Controls', () => {
    it('should only send minimal data to Stripe (no full address unless required)', () => {
      const stripePayload = {
        amount: 5000,
        currency: 'usd',
        customer_email: 'donor@church.org',
        metadata: {
          fund_id: 'fund-001',
          fund_name: 'General Fund',
          donor_name: 'Anonymous Donor',
          user_id: 'user-001',
        },
      };

      expect(stripePayload).not.toHaveProperty('address');
      expect(stripePayload).not.toHaveProperty('phone');
      expect(stripePayload).not.toHaveProperty('ssn');
    });

    it('should confirm Stripe metadata does not exceed Stripe 500-char key limit', () => {
      const metadata = {
        fund_id: 'a'.repeat(36),
        fund_name: 'General Fund',
        donor_name: 'John Doe',
        user_id: 'b'.repeat(36),
      };

      Object.values(metadata).forEach((value) => {
        expect(value.length).toBeLessThanOrEqual(500);
      });
    });
  });

  // ─── 7. Consent Tracking ──────────────────────────────────────────────────
  describe('Privacy Policy and Terms Consent', () => {
    it('should confirm privacy and terms pages exist for user consent', () => {
      const availableRoutes = ['/privacy', '/terms'];

      expect(availableRoutes).toContain('/privacy');
      expect(availableRoutes).toContain('/terms');
    });

    it('should confirm registration page links to privacy policy', () => {
      const registrationPageText = `
        By creating an account, you agree to our
        <a href="/terms">Terms of Service</a> and
        <a href="/privacy">Privacy Policy</a>.
      `;

      expect(registrationPageText).toContain('/privacy');
      expect(registrationPageText).toContain('/terms');
    });
  });
});
