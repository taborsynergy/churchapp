'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader as Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/login');
    } else if (profile.role === 'admin' || profile.role === 'staff') {
      router.replace('/admin');
    } else {
      router.replace('/');
    }
  }, [profile, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
    </div>
  );
}
