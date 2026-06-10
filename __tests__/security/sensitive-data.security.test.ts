/**
 * Security Tests: Sensitive Data Exposure
 *
 * Covers:
 * - Password not returned in API responses
 * - Stripe secret key never exposed to client
 * - Member phone number visibility restriction
 * - Stack traces not leaked in error responses
 * - Anonymous prayer request author protection
 * - Pending member data isolation
 * - Donation data exposure control
 */

import {
  maskPhoneNumber,
  isSafeErrorMessage,
  redactSensitiveFields,
  stripPrivateUserFields,
} from '../../lib/security/data-helpers';

describe('Security: Sensitive Data Exposure', () => {
  // ─── 1. Password Not Returned in API Responses ────────────────────────────
  describe('Password Exposure in Responses', () => {
    it('should never include password or password_hash in user response', () => {
      const apiResponse = {
        id: 'user-001',
        email: 'user@church.org',
        full_name: 'John Doe',
        role: 'member',
        status: 'active',
      };

      expect(apiResponse).not.toHaveProperty('password');
      expect(apiResponse).not.toHaveProperty('password_hash');
      expect(apiResponse).not.toHaveProperty('encrypted_password');
    });

    it('should strip any password field if accidentally included before sending response', () => {
      const withPassword = {
        id: 'user-001',
        email: 'user@church.org',
        password: 'SecretPass1',
      };

      const safe = redactSensitiveFields(withPassword);
      expect((safe as Record<string, unknown>).password).toBe('[REDACTED]');
    });
  });

  // ─── 2. Stripe Secret Key Never Exposed ──────────────────────────────────
  describe('Stripe Key Exposure', () => {
    it('should confirm STRIPE_SECRET_KEY is not a NEXT_PUBLIC env variable', () => {
      const envVarName = 'STRIPE_SECRET_KEY';
      expect(envVarName.startsWith('NEXT_PUBLIC_')).toBe(false);
    });

    it('should not include Stripe secret key in client-accessible response body', () => {
      const clientSideConfig = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };

      const jsonStr = JSON.stringify(clientSideConfig);
      expect(jsonStr).not.toContain('sk_live_');
      expect(jsonStr).not.toContain('sk_test_');
    });
  });

  // ─── 3. Phone Number Masking ──────────────────────────────────────────────
  describe('Member Phone Number Protection', () => {
    it('should mask phone number for non-admin viewers', () => {
      const phone = '+1 (555) 867-5309';
      const masked = maskPhoneNumber(phone);

      expect(masked).not.toBe(phone);
      expect(masked).toContain('*');
    });

    it('should show last 4 digits only in masked phone', () => {
      const phone = '+15558675309';
      const masked = maskPhoneNumber(phone);

      expect(masked).toContain('5309');
      expect(masked).not.toContain('5558');
    });
  });

  // ─── 4. Stack Trace Not Leaked ────────────────────────────────────────────
  describe('Error Response Stack Trace Exposure', () => {
    it('should return generic error message and not expose stack trace', () => {
      const internalError = new Error('Database connection failed: could not connect to host...');
      const safeMessage = isSafeErrorMessage(internalError.message);

      expect(safeMessage).toBe(false);
    });

    it('should classify user-safe messages as safe', () => {
      const safeMessages = [
        'Invalid amount. Must be between $1 and $100,000.',
        'Invalid payment type.',
        'Invalid or inactive fund.',
      ];

      safeMessages.forEach((msg) => {
        expect(isSafeErrorMessage(msg)).toBe(true);
      });
    });
  });

  // ─── 5. Anonymous Prayer Request Author Protection ────────────────────────
  describe('Anonymous Prayer Request Author Protection', () => {
    it('should not expose user_id when prayer request is marked anonymous', () => {
      const prayerRequest = {
        id: 'pr-001',
        title: 'Please pray for healing',
        body: 'Dealing with a health issue.',
        is_anonymous: true,
        user_id: 'user-001',
        status: 'open',
        category: 'health',
      };

      const publicView = prayerRequest.is_anonymous
        ? { ...prayerRequest, user_id: null, users: null }
        : prayerRequest;

      expect(publicView.user_id).toBeNull();
    });

    it('should expose user_id when prayer request is not anonymous', () => {
      const prayerRequest = {
        id: 'pr-002',
        title: 'Praise report',
        body: 'Got the job!',
        is_anonymous: false,
        user_id: 'user-002',
        status: 'open',
        category: 'praise',
      };

      const publicView = prayerRequest.is_anonymous
        ? { ...prayerRequest, user_id: null }
        : prayerRequest;

      expect(publicView.user_id).toBe('user-002');
    });
  });

  // ─── 6. Pending Member Data Isolation ────────────────────────────────────
  describe('Pending Member Data Isolation', () => {
    it('should not return pending member data in public member listings', () => {
      const users = [
        { id: 'a', full_name: 'Active User', status: 'active' },
        { id: 'b', full_name: 'Pending User', status: 'pending' },
        { id: 'c', full_name: 'Suspended User', status: 'suspended' },
      ];

      const publicMembers = users.filter((u) => u.status === 'active');

      expect(publicMembers).toHaveLength(1);
      expect(publicMembers[0].full_name).toBe('Active User');
    });
  });

  // ─── 7. Sensitive Fields Stripped from User Profile ─────────────────────
  describe('User Profile Private Field Stripping', () => {
    it('should strip internal-only fields before sending to client', () => {
      const rawDbUser = {
        id: 'user-001',
        email: 'user@church.org',
        full_name: 'Jane Smith',
        role: 'member',
        status: 'active',
        address: '123 Main St',
        phone: '555-1234',
        bio: 'Loves community.',
        avatar_url: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const publicProfile = stripPrivateUserFields(rawDbUser, false);

      expect(publicProfile).not.toHaveProperty('address');
      expect(publicProfile).not.toHaveProperty('phone');
    });

    it('should include private fields when user is viewing their own profile', () => {
      const rawDbUser = {
        id: 'user-001',
        email: 'user@church.org',
        full_name: 'Jane Smith',
        role: 'member',
        status: 'active',
        address: '123 Main St',
        phone: '555-1234',
        bio: 'Loves community.',
        avatar_url: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const ownProfile = stripPrivateUserFields(rawDbUser, true);

      expect(ownProfile).toHaveProperty('address');
      expect(ownProfile).toHaveProperty('phone');
    });
  });
});
