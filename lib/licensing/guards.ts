import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { License, PlanName } from './types';
import { PLAN_LIMITS, GRACE_DAYS } from './types';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function getLicense(churchId: string): Promise<License | null> {
  const { data } = await adminClient()
    .from('licenses')
    .select('*')
    .eq('church_id', churchId)
    .maybeSingle();
  return data ?? null;
}

/** Returns the effective status accounting for grace period arithmetic. */
export function effectiveStatus(license: License): License['status'] {
  const now = new Date();
  if (license.status === 'suspended') return 'suspended';
  if (license.status === 'trial') {
    if (license.trial_ends_at && new Date(license.trial_ends_at) < now) return 'expired';
    return 'trial';
  }
  if (license.status === 'active') {
    if (!license.expires_at) return 'active'; // perpetual
    const exp = new Date(license.expires_at);
    if (exp >= now) return 'active';
    // within grace?
    const grace = new Date(exp);
    grace.setDate(grace.getDate() + GRACE_DAYS);
    if (now <= grace) return 'grace';
    return 'expired';
  }
  return license.status;
}

export function canAccessModule(license: License, module: string): boolean {
  const status = effectiveStatus(license);
  if (status === 'expired' || status === 'suspended') return false;
  return PLAN_LIMITS[license.plan as PlanName]?.modules.includes(module) ?? false;
}

export function daysUntilExpiry(license: License): number | null {
  const exp = license.expires_at ?? license.trial_ends_at;
  if (!exp) return null;
  return Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000);
}
