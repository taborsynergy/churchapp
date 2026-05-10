import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Church, Mail, Zap, Tag } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plans & Pricing | ChurchConnect by Tabor Synergy',
  description: 'Simple, transparent pricing for every church. 14-day free trial — no credit card required. Serve in ₹ or $.',
};

export const revalidate = 3600;

const plans = [
  {
    name: 'Grow',
    badge: null,
    highlight: false,
    priceINR: '₹999',
    priceUSD: '$12',
    periodLabel: '/ month',
    description: 'Everything a growing church needs.',
    limit: 'Up to 300 members',
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/register',
    features: {
      'Member Directory (300 members)': true,
      'Announcements': true,
      'Events & RSVPs': true,
      'Prayer Wall': true,
      'Sermons (upload + stream)': true,
      'Small Groups': true,
      'Online Giving (Razorpay + Stripe)': true,
      'Podcast Episodes': false,
      'Bible Module': false,
      'Priority Support': false,
    },
  },
  {
    name: 'Parish',
    badge: 'Most Popular',
    highlight: true,
    priceINR: '₹2,499',
    priceUSD: '$29',
    periodLabel: '/ month',
    description: 'Full platform for established parishes.',
    limit: 'Up to 1,500 members',
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/register',
    features: {
      'Member Directory (1,500 members)': true,
      'Announcements': true,
      'Events & RSVPs': true,
      'Prayer Wall': true,
      'Sermons (upload + stream)': true,
      'Small Groups': true,
      'Online Giving (Razorpay + Stripe)': true,
      'Podcast Episodes': true,
      'Bible Module': true,
      'Priority Support': false,
    },
  },
  {
    name: 'Diocese',
    badge: null,
    highlight: false,
    priceINR: '₹6,999',
    priceUSD: '$79',
    periodLabel: '/ month',
    description: 'Multi-campus management for dioceses.',
    limit: 'Unlimited members · Multi-church',
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/register',
    features: {
      'Unlimited Members': true,
      'Announcements': true,
      'Events & RSVPs': true,
      'Prayer Wall': true,
      'Sermons (upload + stream)': true,
      'Small Groups': true,
      'Online Giving (Razorpay + Stripe)': true,
      'Podcast Episodes': true,
      'Bible Module': true,
      'Priority Support': true,
    },
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Launch promo banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white py-3 px-4 text-center text-sm font-medium">
        <Tag className="inline h-4 w-4 mr-2 -mt-0.5" />
        Launch offer: <strong>50% off</strong> first 3 months with code{' '}
        <span className="bg-white/20 font-mono px-2 py-0.5 rounded text-xs tracking-widest font-bold">LAUNCH50</span>
        {' '}· First 25 churches get Parish plan at Grow price — locked forever.
      </div>

      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-teal-500/20 text-teal-400 border-teal-500/30">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple pricing for every church
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            14-day free trial — no credit card required. Pay in $ or ₹. Cancel anytime.
          </p>
          <p className="text-slate-500 text-sm mt-2">Annual billing saves 2 months (~20% off)</p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                plan.highlight
                  ? 'border-teal-500 bg-teal-500/5 shadow-xl shadow-teal-500/10'
                  : 'border-slate-700 bg-slate-900/50'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">{plan.description}</p>

                <div className="mb-1">
                  <span className="text-3xl font-extrabold text-teal-400">{plan.priceUSD}</span>
                  <span className="text-slate-400 text-xs ml-1">{plan.periodLabel}</span>
                </div>
                <p className="text-slate-500 text-xs">{plan.priceINR}{plan.periodLabel} INR</p>
                {plan.name !== 'Free' && (
                  <p className="text-teal-400 text-xs mt-1 font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" /> 14-day free trial
                  </p>
                )}
                <p className="text-slate-400 text-xs mt-2 font-medium">{plan.limit}</p>
              </div>

              <ul className="space-y-2 flex-1 mb-7">
                {Object.entries(plan.features).map(([feature, enabled]) => (
                  <li key={feature} className="flex items-start gap-2 text-xs">
                    {enabled ? (
                      <Check className="h-3.5 w-3.5 text-teal-400 shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <span className={enabled ? 'text-slate-200' : 'text-slate-500'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="sm"
                className={
                  plan.highlight
                    ? 'bg-teal-500 hover:bg-teal-400 text-white font-semibold'
                    : 'bg-slate-700 hover:bg-slate-600 text-white font-semibold'
                }
              >
                <Link href={plan.ctaHref}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Annual discount callout */}
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white text-lg mb-1">Save 20% with annual billing</p>
            <p className="text-slate-400 text-sm">Pay yearly and get 2 months free on any plan. Email us to switch.</p>
          </div>
          <Button asChild className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shrink-0">
            <Link href="/support">Get Annual Pricing</Link>
          </Button>
        </div>

        {/* Payment logos */}
        <div className="text-center mb-14">
          <p className="text-slate-500 text-sm mb-4">Secure payments via</p>
          <div className="flex flex-wrap justify-center gap-3 items-center">
            {['PayPal', 'Razorpay', 'Stripe', 'UPI', 'Visa', 'Mastercard', 'Net Banking'].map((logo) => (
              <span
                key={logo}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700"
              >
                {logo}
              </span>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-3">Pay via PayPal · US churches pay in $ via Stripe · Indian churches pay in ₹ via Razorpay</p>
        </div>

        {/* FAQ / Contact */}
        <div className="text-center rounded-2xl border border-slate-700 bg-slate-900/50 p-10">
          <Church className="h-8 w-8 text-teal-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Questions about pricing?</h3>
          <p className="text-slate-400 mb-2 max-w-md mx-auto">
            We offer custom pricing for seminaries, bible colleges, and large diocese networks.
          </p>
          <p className="text-slate-500 text-sm mb-6">Usually reply within 4 hours on business days.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-teal-500 hover:bg-teal-400 text-white font-semibold">
              <Link href="/support">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 bg-transparent">
              <a href="mailto:admin@taborsynergy.com?subject=ChurchConnect pricing enquiry">
                admin@taborsynergy.com
              </a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
