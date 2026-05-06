import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trial Expired | ChurchConnect',
  robots: { index: false, follow: false },
};

export default function TrialExpiredPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Your free trial has ended</h1>
        <p className="text-slate-400 mb-8">
          Your 14-day free trial of ChurchConnect has expired. Upgrade to a paid plan to restore access
          to your church&apos;s data, sermons, events, and all other features.
        </p>

        <div className="space-y-3">
          <Button asChild className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold h-12">
            <Link href="/pricing">
              View Plans & Pricing
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 h-12">
            <a href="mailto:admin@taborsynergy.com">
              <Mail className="h-4 w-4 mr-2" />
              Contact admin@taborsynergy.com
            </a>
          </Button>
        </div>

        <p className="text-slate-600 text-xs mt-8">
          Your data is preserved for 30 days after trial expiry.
          ChurchConnect is powered by{' '}
          <a href="https://taborsynergy.com" className="text-teal-500 hover:underline">Tabor Synergy</a>.
        </p>
      </div>
    </main>
  );
}
