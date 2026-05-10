import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldOff, ArrowRight, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Licence Expired | ChurchConnect',
  robots: { index: false, follow: false },
};

function PayPalIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19.5 6.5C19.5 9.5 17.5 11.5 14.5 11.5H12.5L11.5 17.5H8.5L10.5 6.5H19.5Z" fill="#003087" />
      <path d="M17.5 4.5C17.5 7.5 15.5 9.5 12.5 9.5H10.5L9.5 15.5H6.5L8.5 4.5H17.5Z" fill="#009cde" />
    </svg>
  );
}

export default function LicenseExpiredPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Licence expired</h1>
        <p className="text-slate-400 mb-6">
          Your ChurchConnect licence has expired and the grace period has ended. Renew your licence
          immediately to restore access for your congregation.
        </p>

        {/* PayPal renewal box */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5 text-left">
          <p className="text-white font-semibold mb-1">Renew instantly with PayPal</p>
          <p className="text-slate-400 text-sm mb-4">
            Send payment to <span className="text-white font-medium">@write2dinakar</span> on PayPal.
            Include your <strong className="text-slate-200">church name</strong> and <strong className="text-slate-200">plan</strong> in the note.
            Access is restored within a few hours of payment.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-center">
            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-slate-400">Grow</p>
              <p className="text-white font-bold">$29/mo</p>
              <p className="text-slate-500">₹2,499/mo · 100 members</p>
            </div>
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-2">
              <p className="text-teal-400">Parish ⭐</p>
              <p className="text-white font-bold">$49/mo</p>
              <p className="text-slate-500">₹3,999/mo · 300 members</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-slate-400">Diocese</p>
              <p className="text-white font-bold">$99/mo</p>
              <p className="text-slate-500">₹7,999/mo · 500 members</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-slate-400">Network</p>
              <p className="text-white font-bold">$149/mo</p>
              <p className="text-slate-500">₹11,999/mo · 1,000 members</p>
            </div>
          </div>
          <a
            href="https://paypal.me/write2dinakar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-semibold rounded-lg py-3 transition-colors"
          >
            <PayPalIcon />
            Pay with PayPal
          </a>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold h-12">
            <Link href="/pricing">
              View Full Pricing Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 h-12">
            <a href="mailto:admin@taborsynergy.com?subject=ChurchConnect licence renewal&body=Church name: %0APlan: %0AMessage: ">
              <Mail className="h-4 w-4 mr-2" />
              Email admin@taborsynergy.com
            </a>
          </Button>
        </div>

        <p className="text-slate-600 text-xs mt-8">
          Need an emergency extension? Email us with your church name and we&apos;ll respond within 4 hours.
          ChurchConnect is powered by{' '}
          <a href="https://taborsynergy.com" className="text-teal-500 hover:underline">Tabor Synergy</a>.
        </p>
      </div>
    </main>
  );
}
