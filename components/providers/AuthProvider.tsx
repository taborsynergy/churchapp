'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';
import { PLAN_LIMITS } from '@/lib/licensing/types';
import type { PlanName, LicenseStatus } from '@/lib/licensing/types';

const SUPER_ADMIN_EMAIL = 'admin@taborsynergy.com';

interface LicenseInfo {
  plan: PlanName;
  status: LicenseStatus;
  seat_limit: number;
  trial_ends_at: string | null;
  expires_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  license: LicenseInfo | null;
  loading: boolean;
  canAccess: (module: string) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  license: null,
  loading: true,
  canAccess: () => true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedId = useRef<string | null>(null);

  async function fetchProfileAndLicense(userId: string, force = false) {
    if (!force && lastFetchedId.current === userId) return;
    lastFetchedId.current = userId;

    const { data: profileData } = await supabase
      .from('church_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(profileData ?? null);

    if (profileData?.church_id) {
      const { data: licData } = await supabase
        .from('licenses')
        .select('plan, status, seat_limit, trial_ends_at, expires_at')
        .eq('church_id', profileData.church_id)
        .maybeSingle();
      setLicense(licData ?? null);
    } else {
      setLicense(null);
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfileAndLicense(user.id, true);
  }

  const canAccess = useCallback((module: string): boolean => {
    if (user?.email === SUPER_ADMIN_EMAIL) return true;
    if (!license) return true; // still loading — don't flash lock screen
    return PLAN_LIMITS[license.plan]?.modules.includes(module) ?? false;
  }, [license, user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndLicense(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndLicense(session.user.id).finally(() => setLoading(false));
      } else {
        lastFetchedId.current = null;
        setProfile(null);
        setLicense(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, license, loading, canAccess, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
