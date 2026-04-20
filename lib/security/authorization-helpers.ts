import type { UserProfile, UserRole } from '../types';

export function canAccessAdminPanel(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.status !== 'active') return false;
  return user.role === 'admin' || user.role === 'staff';
}

export function canViewDirectory(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.status === 'active';
}

export function canSubmitPrayerRequest(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.status === 'active';
}

export function canUpdateUserRole(
  requestingUser: UserProfile,
  targetUserId: string,
  newRole: string
): boolean {
  if (requestingUser.id === targetUserId) return false;
  if (requestingUser.status !== 'active') return false;
  return requestingUser.role === 'admin' || requestingUser.role === 'staff';
}

export function canViewDonation(viewer: UserProfile, donationOwnerId: string): boolean {
  if (viewer.id === donationOwnerId) return true;
  if (viewer.status !== 'active') return false;
  return viewer.role === 'admin' || viewer.role === 'staff';
}

export function isOwnerOrAdmin(user: UserProfile, resourceOwnerId: string): boolean {
  if (user.id === resourceOwnerId) return true;
  if (user.status !== 'active') return false;
  return user.role === 'admin' || user.role === 'staff';
}

export function hasRole(user: UserProfile, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}
