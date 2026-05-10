'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, Loader as Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-950 px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-5">
            <Lock className="h-10 w-10 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Members Only</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Sign in to your account or start a free 14-day trial to access this feature.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-teal-500 hover:bg-teal-400 text-white font-semibold"
            >
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign In</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-slate-600 text-slate-200 hover:bg-slate-800 bg-transparent"
            >
              <Link href="/register">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
