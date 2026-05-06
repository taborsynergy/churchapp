'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockedModuleProps {
  moduleName: string;
  requiredPlan?: 'church' | 'diocese';
}

export function LockedModule({ moduleName, requiredPlan = 'church' }: LockedModuleProps) {
  const planLabel = requiredPlan === 'diocese' ? 'Diocese' : 'Church';
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="h-10 w-10 text-teal-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{moduleName} is Locked</h2>
        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
          Upgrade to the <span className="text-teal-400 font-semibold">{planLabel} plan</span> to unlock {moduleName} for your congregation.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold">
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
            <a href="mailto:admin@taborsynergy.com">Contact admin@taborsynergy.com</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
