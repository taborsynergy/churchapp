/**
 * Security Tests: Authorization
 *
 * Covers:
 * - Privilege escalation prevention
 * - IDOR (Insecure Direct Object Reference)
 * - Staff vs member role bypass attempts
 * - Pending/suspended account access control
 * - Admin-only route enforcement
 * - Role boundary enforcement
 */

import {
  canAccessAdminPanel,
  canViewDirectory,
  canSubmitPrayerRequest,
  canUpdateUserRole,
  canViewDonation,
  isOwnerOrAdmin,
  hasRole,
} from '../../lib/security/authorization-helpers';
import type { UserProfile } from '../../lib/types';

const makeUser = (overrides: Partial<UserProfile>): UserProfile => ({
  id: 'user-001',
  email: 'test@church.org',
  full_name: 'Test User',
  role: 'member',
  status: 'active',
  avatar_url: '',
  phone: '',
  bio: '',
  address: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('Security: Authorization', () => {
  // ─── 1. Admin Panel Access ────────────────────────────────────────────────
  describe('Admin Panel Privilege Escalation', () => {
    it('should deny members from accessing admin panel', () => {
      const member = makeUser({ role: 'member', status: 'active' });
      expect(canAccessAdminPanel(member)).toBe(false);
    });

    it('should deny pending users from accessing admin panel', () => {
      const pending = makeUser({ role: 'pending', status: 'pending' });
      expect(canAccessAdminPanel(pending)).toBe(false);
    });

    it('should allow admin users to access admin panel', () => {
      const admin = makeUser({ role: 'admin', status: 'active' });
      expect(canAccessAdminPanel(admin)).toBe(true);
    });

    it('should allow staff users to access admin panel', () => {
      const staff = makeUser({ role: 'staff', status: 'active' });
      expect(canAccessAdminPanel(staff)).toBe(true);
    });

    it('should deny admin with suspended status from accessing admin panel', () => {
      const suspendedAdmin = makeUser({ role: 'admin', status: 'suspended' });
      expect(canAccessAdminPanel(suspendedAdmin)).toBe(false);
    });
  });

  // ─── 2. IDOR — Donation Record Access ────────────────────────────────────
  describe('IDOR: Donation Record Access', () => {
    it('should allow a user to view their own donation', () => {
      const user = makeUser({ id: 'user-abc' });
      expect(canViewDonation(user, 'user-abc')).toBe(true);
    });

    it('should deny a regular member from viewing another user donation', () => {
      const member = makeUser({ id: 'user-abc', role: 'member' });
      expect(canViewDonation(member, 'user-xyz')).toBe(false);
    });

    it('should allow admin to view any donation record', () => {
      const admin = makeUser({ id: 'admin-001', role: 'admin', status: 'active' });
      expect(canViewDonation(admin, 'user-xyz')).toBe(true);
    });
  });

  // ─── 3. Role Escalation — Users Cannot Change Own Role ───────────────────
  describe('Role Escalation Prevention', () => {
    it('should prevent a member from promoting themselves to admin', () => {
      const requestingUser = makeUser({ id: 'user-001', role: 'member' });
      const targetUserId = 'user-001';
      const newRole = 'admin';

      expect(canUpdateUserRole(requestingUser, targetUserId, newRole)).toBe(false);
    });

    it('should prevent a member from promoting themselves to staff', () => {
      const requestingUser = makeUser({ id: 'user-001', role: 'member' });
      expect(canUpdateUserRole(requestingUser, 'user-001', 'staff')).toBe(false);
    });

    it('should allow admin to update another user role', () => {
      const admin = makeUser({ id: 'admin-001', role: 'admin', status: 'active' });
      expect(canUpdateUserRole(admin, 'user-002', 'member')).toBe(true);
    });
  });

  // ─── 4. Directory Access — Active Members Only ───────────────────────────
  describe('Member Directory Access Control', () => {
    it('should deny pending users from viewing member directory', () => {
      const pending = makeUser({ role: 'pending', status: 'pending' });
      expect(canViewDirectory(pending)).toBe(false);
    });

    it('should deny suspended users from viewing member directory', () => {
      const suspended = makeUser({ role: 'member', status: 'suspended' });
      expect(canViewDirectory(suspended)).toBe(false);
    });

    it('should allow active members to view member directory', () => {
      const active = makeUser({ role: 'member', status: 'active' });
      expect(canViewDirectory(active)).toBe(true);
    });
  });

  // ─── 5. Prayer Request — Active Members Only ─────────────────────────────
  describe('Prayer Request Submission', () => {
    it('should deny unauthenticated (null) user from submitting prayer requests', () => {
      expect(canSubmitPrayerRequest(null)).toBe(false);
    });

    it('should deny pending accounts from submitting prayer requests', () => {
      const pending = makeUser({ status: 'pending' });
      expect(canSubmitPrayerRequest(pending)).toBe(false);
    });

    it('should allow active members to submit prayer requests', () => {
      const active = makeUser({ status: 'active' });
      expect(canSubmitPrayerRequest(active)).toBe(true);
    });
  });

  // ─── 6. Ownership Check ──────────────────────────────────────────────────
  describe('Ownership and Admin Override', () => {
    it('should confirm ownership when user ID matches resource owner', () => {
      const user = makeUser({ id: 'user-001', role: 'member' });
      expect(isOwnerOrAdmin(user, 'user-001')).toBe(true);
    });

    it('should deny access when user is not owner and not admin', () => {
      const user = makeUser({ id: 'user-001', role: 'member' });
      expect(isOwnerOrAdmin(user, 'user-999')).toBe(false);
    });

    it('should grant access when user is admin regardless of ownership', () => {
      const admin = makeUser({ id: 'admin-001', role: 'admin', status: 'active' });
      expect(isOwnerOrAdmin(admin, 'user-999')).toBe(true);
    });
  });

  // ─── 7. Role Helper Utility ───────────────────────────────────────────────
  describe('Role Check Utility', () => {
    it('should correctly identify a user as having a specified role', () => {
      const admin = makeUser({ role: 'admin' });
      expect(hasRole(admin, ['admin', 'staff'])).toBe(true);
    });

    it('should return false when user role is not in the allowed list', () => {
      const member = makeUser({ role: 'member' });
      expect(hasRole(member, ['admin', 'staff'])).toBe(false);
    });
  });
});
