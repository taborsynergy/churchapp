'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Clock } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface LicenseSummary {
  status: 'trial' | 'active' | 'grace' | 'expired' | 'suspended';
  daysLeft: number | null;
  plan: string;
}

export function TrialBanner() {
  const { user, profile } = useAuth();
  const [license, setLicense] = useState<LicenseSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    const churchId = profile.church_id;
    if (!churchId) return;

    supabase
      .from('licenses')
      .select('status, plan, trial_ends_at, expires_at')
      .eq('church_id', churchId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const now = new Date();
        const expiry = data.trial_ends_at ?? data.expires_at;
        const daysLeft = expiry
          ? Math.ceil((new Date(expiry).getTime() - now.getTime()) / 86_400_000)
          : null;
        setLicense({ status: data.status, plan: data.plan, daysLeft });
      });
  }, [user, profile]);

  if (dismissed || !license) return null;
  if (license.status === 'active' && (license.daysLeft === null || license.daysLeft > 7)) return null;
  if (license.status === 'expired' || license.status === 'suspended') return null;

  const isTrial = license.status === 'trial';
  const isGrace = license.status === 'grace';
  const urgentColor = (license.daysLeft !== null && license.daysLeft <= 2) || isGrace
    ? 'bg-red-500/10 border-red-500/30 text-red-300'
    : 'bg-amber-500/10 border-amber-500/30 text-amber-300';

  let message = '';
  if (isTrial) {
    message = license.daysLeft !== null && license.daysLeft >= 0
      ? `Your free trial ends in ${license.daysLeft} day${license.daysLeft !== 1 ? 's' : ''}.`
      : 'Your free trial has ended.';
  } else if (isGrace) {
    message = `Your licence expired — grace period ending${license.daysLeft !== null ? ` in ${license.daysLeft} day${license.daysLeft !== 1 ? 's' : ''}` : ''}.`;
  } else {
    message = `Your licence renews${license.daysLeft !== null ? ` in ${license.daysLeft} day${license.daysLeft !== 1 ? 's' : ''}` : ' soon'}.`;
  }

  return (
    <div className={`w-full border-b px-4 py-2.5 flex items-center justify-between gap-4 text-sm ${urgentColor}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-4 w-4 shrink-0" />
        <span className="truncate">{message}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/pricing" className="underline underline-offset-2 font-semibold hover:opacity-80 whitespace-nowrap">
          Upgrade now
        </Link>
        <button
          aria-label="Dismiss banner"
          onClick={() => setDismissed(true)}
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
