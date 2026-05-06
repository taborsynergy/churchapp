export type PlanName = 'starter' | 'church' | 'diocese';
export type LicenseStatus = 'trial' | 'active' | 'grace' | 'expired' | 'suspended';

export interface License {
  id: string;
  church_id: string;
  plan: PlanName;
  status: LicenseStatus;
  trial_ends_at: string | null;
  starts_at: string | null;
  expires_at: string | null;
  grace_ends_at: string | null;
  seat_limit: number;
  created_at: string;
  updated_at: string;
}

export const PLAN_LIMITS: Record<PlanName, { seats: number; modules: string[] }> = {
  starter: {
    seats: 200,
    modules: ['sermons', 'events', 'announcements', 'prayer', 'directory', 'give'],
  },
  church: {
    seats: 2000,
    modules: ['sermons', 'events', 'announcements', 'prayer', 'directory', 'give', 'groups', 'podcast', 'bible'],
  },
  diocese: {
    seats: -1, // unlimited
    modules: ['sermons', 'events', 'announcements', 'prayer', 'directory', 'give', 'groups', 'podcast', 'bible', 'multi_campus'],
  },
};

export const TRIAL_DAYS = 14;
export const GRACE_DAYS = 3;
export const EXPIRY_WARNING_DAYS = 7;
