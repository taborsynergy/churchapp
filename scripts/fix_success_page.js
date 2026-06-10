const fs = require('fs');
const src = fs.readFileSync('app/subscribe/success/page.tsx', 'utf8');

// Split into inner component + default export wrapped in Suspense
const newContent = `'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, Church } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PLAN_DISPLAY } from '@/lib/licensing/types';
import type { PlanName } from '@/lib/licensing/types';

function SuccessContent() {
  const params         = useSearchParams();
  const subscriptionId = params.get('subscription_id');
  const plan           = (params.get('plan') ?? 'starter') as PlanName;
  const billing        = params.get('billing') ?? 'monthly';
  const [status, setStatus] = useState<'waiting' | 'active' | 'error'>('waiting');

  useEffect(() => {
    if (!subscriptionId) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch('/api/subscribe/status');
        const data = await res.json();
        if (data.status === 'active') {
          setStatus('active');
          clearInterval(interval);
        } else if (attempts >= 20) {
          clearInterval(interval);
        }
      } catch {
        if (attempts >= 20) clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [subscriptionId]);

  const planLabel = PLAN_DISPLAY[plan] ?? plan;

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          {status === 'active' ? (
            <CheckCircle className="h-16 w-16 text-teal-400 mx-auto" />
          ) : (
            <div className="relative mx-auto w-16 h-16">
              <Church className="h-16 w-16 text-teal-400 mx-auto" />
              <Loader2 className="h-6 w-6 text-teal-300 animate-spin absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5" />
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          {status === 'active' ? "You\'re all set! 🎉" : 'Payment received!'}
        </h1>

        <p className="text-slate-400 mb-2">
          <span className="text-teal-400 font-semibold">{planLabel}</span>
          {' '}· {billing === 'annual' ? 'Annual billing' : 'Monthly billing'}
        </p>

        {status === 'waiting' && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 text-teal-400 animate-spin shrink-0" />
              <p className="text-white font-medium">Activating your license…</p>
            </div>
            <p className="text-slate-400 text-sm">
              PayPal is confirming your payment. This usually takes a few seconds.
            </p>
          </div>
        )}

        {status === 'active' && (
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-5 mb-6 text-left">
            <p className="text-teal-300 font-medium mb-1">✅ License activated</p>
            <p className="text-slate-400 text-sm">
              Your {planLabel} plan is live. A confirmation email is on its way.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button asChild className="bg-teal-500 hover:bg-teal-400 text-white font-semibold w-full">
            <Link href="/admin">Go to Admin Dashboard →</Link>
          </Button>
          <Button asChild variant="ghost" className="text-slate-400 hover:text-slate-200 w-full">
            <Link href="/admin/settings">View Subscription Settings</Link>
          </Button>
        </div>

        {subscriptionId && (
          <p className="text-slate-600 text-xs mt-6">Subscription ID: {subscriptionId}</p>
        )}
      </div>
    </main>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-8 w-8 text-teal-400 animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
`;
fs.writeFileSync('app/subscribe/success/page.tsx', newContent);
console.log('success page fixed with Suspense boundary');
