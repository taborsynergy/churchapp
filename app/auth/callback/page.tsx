'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    // detectSessionInUrl:true means the Supabase client automatically
    // exchanges the code/token in the URL hash before firing onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password');
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setMessage('Setting up your account…');

        // Ensure a church_users record exists (handles first-time Google/OAuth users)
        const { data: existing } = await supabase
          .from('church_users')
          .select('id, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!existing) {
          const meta = session.user.user_metadata ?? {};
          await supabase.from('church_users').insert({
            id: session.user.id,
            email: session.user.email ?? '',
            full_name: meta.full_name ?? meta.name ?? '',
            avatar_url: meta.avatar_url ?? meta.picture ?? '',
            role: 'pending',
            status: 'pending',
          });
        }

        const role = existing?.role;
        if (role === 'admin' || role === 'staff') {
          router.replace('/admin');
        } else {
          router.replace('/');
        }
      }
    });

    // Fallback: if session is already present (e.g. page re-loaded after OAuth)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('church_users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        const role = profile?.role;
        router.replace(role === 'admin' || role === 'staff' ? '/admin' : '/');
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
