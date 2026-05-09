'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader } from 'lucide-react';

async function resolveRedirect(userId: string, email: string, meta: Record<string, any>): Promise<string> {
  // Upsert church_users — ignoreDuplicates so existing data is preserved
  await supabase.from('church_users').upsert(
    {
      id: userId,
      email,
      full_name: meta.full_name ?? meta.name ?? '',
      avatar_url: meta.avatar_url ?? meta.picture ?? '',
      role: 'pending',
      status: 'pending',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  const { data: profile } = await supabase
    .from('church_users')
    .select('role, church_id')
    .eq('id', userId)
    .maybeSingle();

  // New user with no church yet → onboarding
  if (!profile?.church_id) return '/onboarding';

  // Existing admin/staff → admin dashboard
  if (profile.role === 'admin' || profile.role === 'staff') return '/admin';

  // Existing member → home
  return '/';
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password');
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setMessage('Setting up your account…');
        const dest = await resolveRedirect(
          session.user.id,
          session.user.email ?? '',
          session.user.user_metadata ?? {}
        );
        router.replace(dest);
      }
    });

    // Fallback for already-active sessions (page reload after OAuth)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const dest = await resolveRedirect(
          session.user.id,
          session.user.email ?? '',
          session.user.user_metadata ?? {}
        );
        router.replace(dest);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
      <Loader className="h-8 w-8 animate-spin text-teal-400" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}
