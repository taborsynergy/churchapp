import type { UserProfile } from '../types';

const EXCESSIVE_FIELDS = new Set(['ssn', 'social_security', 'government_id', 'date_of_birth', 'tax_id']);
const REGISTRATION_FIELDS = new Set(['email', 'full_name', 'password']);

export function canExportOwnData(user: UserProfile, targetUserId: string): boolean {
  return user.id === targetUserId;
}

export function canDeleteOwnAccount(user: UserProfile, targetUserId: string): boolean {
  return user.id === targetUserId;
}

export function filterPiiForExport(user: UserProfile): Partial<UserProfile> {
  const { role, status, ...piiFields } = user;
  void role;
  void status;
  return piiFields;
}

export function isMinimalDataCollection(fields: string[]): boolean {
  return !fields.some((f) => EXCESSIVE_FIELDS.has(f.toLowerCase()));
}

export function isAnonymousDataSafe(request: {
  is_anonymous: boolean;
  user_id: string | null;
  [key: string]: unknown;
}): boolean {
  if (!request.is_anonymous) return true;
  return request.user_id === null || request.user_id === undefined;
}
