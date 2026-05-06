import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Church, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plans & Pricing | ChurchConnect by Tabor Synergy',
  description: 'Simple, transparent pricing for every church. Start free for 14 days — no credit card required.',
};

const plans = [
  {
    name: 'Starter',
    badge: null,
    priceINR: '₹1,999',
    priceUSD: '$25',
    periodLabel: '/ month',
    oneTimeINR: '₹24,999',
    oneTimeUSD: '$299',
    trial: '14-day free trial',
    description: 'Perfect for small congregations just getting started.',
    seats: 200,
    features: {
      'Sermons (upload + stream)': true,
      'Events & RSVPs': true,
      'Announcements': true,
      'Prayer Wall': true,
      'Member Directory': true,
      'Giving / Donations': true,
      'Small Groups': false,
      'Podcast Episodes': false,
      'Bible Module': false,
      'White-label Branding': false,
      'Multi-campus (Diocese)': false,
      'Priority Support': false,
    },
  },
  {
    name: 'Church',
    badge: 'Most Popular',
    priceINR: '₹4,999',
    priceUSD: '$60',
    periodLabel: '/ month',
    oneTimeINR: '₹64,999',
    oneTimeUSD: '$799',
    trial: '14-day free trial',
    description: 'Everything a growing church needs in one place.',
    seats: 2000,
    features: {
      'Sermons (upload + stream)': true,
      'Events & RSVPs': true,
      'Announcements': true,
      'Prayer Wall': true,
      'Member Directory': true,
      'Giving / Donations': true,
      'Small Groups': true,
      'Podcast Episodes': true,
      'Bible Module': true,
      'White-label Branding': true,
      'Multi-campus (Diocese)': false,
      'Priority Support': false,
    },
  },
  {
    name: 'Diocese',
    badge: null,
    priceINR: '₹12,999',
    priceUSD: '$159',
    periodLabel: '/ month',
    oneTimeINR: '₹1,64,999',
    oneTimeUSD: '$1,999',
    trial: '14-day free trial',
    description: 'Multi-campus management for dioceses and large ministries.',
    seats: -1,
    features: {
      'Sermons (upload + stream)': true,
      'Events & RSVPs': true,
      'Announcements': true,
      'Prayer Wall': true,
      'Member Directory': true,
      'Giving / Donations': true,
      'Small Groups': true,
      'Podcast Episodes': true,
      'Bible Module': true,
      'White-label Branding': true,
      'Multi-campus (Diocese)': true,
      'Priority Support': true,
    },
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-teal-500/20 text-teal-400 border-teal-500/30">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple pricing for every church
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Start your free 14-day trial today. No credit card required. Upgrade or cancel anytime.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.badge
                  ? 'border-teal-500 bg-teal-500/5'
                  : 'border-slate-700 bg-slate-900/50'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                {/* Price */}
                <div className="mb-1">
                  <span className="text-3xl font-extrabold text-teal-400">{plan.priceINR}</span>
                  <span className="text-slate-400 text-sm ml-1">{plan.periodLabel}</span>
                  <span className="text-slate-500 text-sm ml-2">/ {plan.priceUSD}{plan.periodLabel}</span>
                </div>
                <p className="text-slate-500 text-xs">
                  or {plan.oneTimeINR} / {plan.oneTimeUSD} one-time licence
                </p>
                <p className="text-teal-400 text-xs mt-1 font-medium">{plan.trial}</p>

                {/* Seat limit */}
                <p className="text-slate-400 text-xs mt-2">
                  {plan.seats === -1 ? 'Unlimited members' : `Up to ${plan.seats.toLocaleString()} members`}
                </p>
              </div>

              {/* Feature list */}
              <ul className="space-y-2.5 flex-1 mb-8">
                {Object.entries(plan.features).map(([feature, enabled]) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    {enabled ? (
                      <Check className="h-4 w-4 text-teal-400 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                    <span className={enabled ? 'text-slate-200' : 'text-slate-500'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={
                  plan.badge
                    ? 'bg-teal-500 hover:bg-teal-400 text-white font-semibold'
                    : 'bg-slate-700 hover:bg-slate-600 text-white font-semibold'
                }
              >
                <Link href="/register">Start Free 14-Day Trial</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Payment logos */}
        <div className="text-center mb-14">
          <p className="text-slate-500 text-sm mb-4">Secure payments via</p>
          <div className="flex flex-wrap justify-center gap-4 items-center">
            {['Razorpay', 'Stripe', 'Visa', 'Mastercard', 'UPI'].map((logo) => (
              <span
                key={logo}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        {/* FAQ / Contact */}
        <div className="text-center rounded-2xl border border-slate-700 bg-slate-900/50 p-10">
          <Church className="h-8 w-8 text-teal-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Questions about pricing?</h3>
          <p className="text-slate-400 mb-6">
            Our team is happy to help you choose the right plan for your church.
          </p>
          <Button asChild className="bg-teal-500 hover:bg-teal-400 text-white font-semibold">
            <a href="mailto:admin@taborsynergy.com">
              <Mail className="h-4 w-4 mr-2" />
              Contact admin@taborsynergy.com
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
