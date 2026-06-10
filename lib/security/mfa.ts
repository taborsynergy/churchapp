'use client';
import { supabase } from '@/lib/supabase';

export async function enrollMFA() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw error;
  return data;
}

export async function verifyAndActivateMFA(factorId: string, code: string) {
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code });
  if (error) throw error;
  return data;
}

export async function getMFAStatus(): Promise<{ enrolled: boolean; factorId?: string }> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const totp = data.totp?.find((f: { status: string }) => f.status === 'verified');
  return { enrolled: !!totp, factorId: totp?.id };
}

export async function unenrollMFA(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
