'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader } from 'lucide-react';

async function resolveRedirect(userId: string, email: string, meta: Record<string, any>): Promise<string> {
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

  if (!profile?.church_id) return '/onboarding';
  if (profile.role === 'admin' || profile.role === 'staff') return '/admin';
  return '/';
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Signing you in…');
  // Prevent double-redirect when both onAuthStateChange and getSession fire (e.g. Google OAuth)
  const redirecting = useRef(false);

  async function handleSession(userId: string, email: string, meta: Record<string, any>) {
    if (redirecting.current) return;
    redirecting.current = true;
    setMessage('Setting up your account…');
    try {
      const dest = await resolveRedirect(userId, email, meta);
      router.replace(dest);
    } catch {
      router.replace('/');
    }
  }

  useEffect(() => {
    // Detect OAuth error params (e.g. user denied Google consent)
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    const errorParam = params.get('error') ?? hashParams.get('error');
    if (errorParam) {
      router.replace(`/login?error=${encodeURIComponent(errorParam)}`);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password');
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        await handleSession(session.user.id, session.user.email ?? '', session.user.user_metadata ?? {});
      }
    });

    // Fallback: session already established before listener fires (common with Google OAuth PKCE)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await handleSession(session.user.id, session.user.email ?? '', session.user.user_metadata ?? {});
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
