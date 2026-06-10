'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Church, Mail, Zap, Tag, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PLAN_DISPLAY, type PlanName } from '@/lib/licensing/types';

const plans: Plan[] = [
  {
    name: 'starter',
    label: 'Grow',
    badge: null,
    highlight: false,
    priceUSD: 29,
    priceINR: '₹2,499',
    description: 'Everything a growing church needs.',
    limit: 'Up to 100 members',
    features: {
      'Member Directory (100 members)': true,
      'Announcements': true,
      'Events & RSVPs': true,
      'Prayer Wall': true,
      'Sermons (upload + stream)': true,
      'Small Groups': true,
      'Online Giving (Razorpay + Stripe)': true,
      'Podcast Episodes': false,
      'Bible Module': false,
      'Multi-Campus Management': false,
      'Priority Support': false,
    },
  },
  {
    name: 'church',
    label: 'Parish',
    badge: 'Most Popular',
    highlight: true,
    priceUSD: 49,
    priceINR: '₹3,999',
    description: 'Full platform for established parishes.',
    limit: 'Up to 300 members',
    features: {
      'Member Directory (300 members)': true,
      'Announcements': true,
      'Events & RSVPs': true,
      'Prayer Wall': true,
      'Sermons (upload + stream)': true,
      'Small Groups': true,
      'Online Giving (Razorpay + Stripe)': true,
      'Podcast Episodes': true,
      'Bible Module': true,
      'Multi-Campus Management': false,
      'Priority Support': false,
    },
  },
  {
    name: 'diocese',
    label: 'Diocese',
    badge: null,
    highlight: false,
    priceUSD: 99,
    priceINR: '₹7,999',
    description: 'Multi-campus management for dioceses.',
    limit: 'Up to 500 members',
    features: {
      'Member Directory (500 members)': true,
      'Announcements': true,
      'Events & RSVPs': true,
      'Prayer Wall': true,
      'Sermons (upload + stream)': true,
      'Small Groups': true,
      'Online Giving (Razorpay + Stripe)': true,
      'Podcast Episodes': true,
      'Bible Module': true,
      'Multi-Campus Management': true,
      'Priority Support': false,
    },
  },
  {
    name: 'network',
    label: 'Network',
    badge: null,
    highlight: false,
    priceUSD: 149,
    priceINR: '₹11,999',
    description: 'For large churches & multi-site networks.',
    limit: 'Up to 1,000 members',
    features: {
      'Member Directory (1,000 members)': true,
      'Announcements': true,
      'Events & RSVPs': true,
      'Prayer Wall': true,
      'Sermons (upload + stream)': true,
      'Small Groups': true,
      'Online Giving (Razorpay + Stripe)': true,
      'Podcast Episodes': true,
      'Bible Module': true,
      'Multi-Campus Management': true,
      'Priority Support': true,
    },
  },
];

interface Plan {
  name: PlanName;
  label: string;
  badge: string | null;
  highlight: boolean;
  priceUSD: number;
  priceINR: string;
  description: string;
  limit: string;
  features: Record<string, boolean>;
}

export default function PricingPage() {
  const router                    = useRouter();
  const [billing, setBilling]     = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading]     = useState<string | null>(null); // plan name while subscribing

  // Discount for annual
  const annualDiscount = 0.8; // 20% off
  const displayPrice   = (usd: number) =>
    billing === 'annual'
      ? `$${Math.round(usd * annualDiscount * 12)}/yr`
      : `$${usd}/mo`;

  async function handleSubscribe(plan: Plan) {
    setLoading(plan.name);
    try {
      const res  = await fetch('/api/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: plan.name, billing }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Not signed in → go to register first
        if (res.status === 401) {
          router.push(`/register?redirect=/pricing&plan=${plan.name}`);
          return;
        }
        alert(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      // Redirect to PayPal approval page
      window.location.href = data.approvalUrl;
    } catch {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Launch promo banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white py-3 px-4 text-center text-sm font-medium">
        <Tag className="inline h-4 w-4 mr-2 -mt-0.5" />
        Launch offer: <strong>50% off</strong> first 3 months with code{' '}
        <span className="bg-white/20 font-mono px-2 py-0.5 rounded text-xs tracking-widest font-bold">LAUNCH50</span>
        {' '}· First 25 churches get Parish plan at Grow price — locked forever.
      </div>

      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-teal-500/20 text-teal-400 border-teal-500/30">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple pricing for every church
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            14-day free trial — no credit card required. Pay via PayPal. Cancel anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                billing === 'monthly'
                  ? 'bg-teal-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billing === 'annual'
                  ? 'bg-teal-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Annual
              <span className="bg-teal-400/20 text-teal-300 text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
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
                <h2 className="text-lg font-bold mb-1">{plan.label}</h2>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">{plan.description}</p>

                <div className="mb-1">
                  <span className="text-3xl font-extrabold text-teal-400">
                    {displayPrice(plan.priceUSD)}
                  </span>
                </div>
                <p className="text-slate-500 text-xs">
                  {plan.priceINR}{billing === 'annual' ? '/yr' : '/mo'} INR
                </p>
                <p className="text-teal-400 text-xs mt-1 font-medium flex items-center gap-1">
                  <Zap className="h-3 w-3" /> 14-day free trial
                </p>
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
                    <span className={enabled ? 'text-slate-200' : 'text-slate-500'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2">
                {/* Start free trial — goes to register */}
                <Button
                  asChild
                  size="sm"
                  className={
                    plan.highlight
                      ? 'bg-teal-500 hover:bg-teal-400 text-white font-semibold'
                      : 'bg-slate-700 hover:bg-slate-600 text-white font-semibold'
                  }
                >
                  <Link href={`/register?plan=${plan.name}`}>Start Free Trial</Link>
                </Button>

                {/* Pay via PayPal — activates license immediately */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={!!loading}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-[#FFC439] bg-[#FFC439]/10 hover:bg-[#FFC439]/20 text-[#FFC439] text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === plan.name ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Redirecting…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#003087]" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.825L8.293 22h3.927l.97-6.148h2.286c4.564 0 7.16-2.272 8.032-6.394.42-1.99.12-3.56-.286-4.541z"/>
                      </svg>
                      Pay with PayPal
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* PayPal info box */}
        <div className="rounded-2xl border border-[#FFC439]/20 bg-[#FFC439]/5 p-6 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-white text-base mb-1">
                💳 SaaS subscription payments via PayPal
              </p>
              <p className="text-slate-400 text-sm">
                Pastors &amp; church admins pay for ChurchConnect via PayPal.
                Your congregation donates to your church separately using Stripe or Razorpay.
              </p>
            </div>
            <a
              href="https://paypal.me/write2dinakar"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-4 py-2 rounded-lg bg-[#003087] text-white text-xs font-bold hover:bg-[#002070] transition-colors"
            >
              PayPal: paypal.me/write2dinakar
            </a>
          </div>
        </div>

        {/* Annual discount callout */}
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white text-lg mb-1">Save 20% with annual billing</p>
            <p className="text-slate-400 text-sm">
              Switch the toggle above to Annual to see your savings. Pay once, covered for a year.
            </p>
          </div>
          <Button
            onClick={() => setBilling('annual')}
            className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shrink-0"
          >
            Switch to Annual
          </Button>
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
              <a href="mailto:admin@taborsynergy.com?subject=ChurchConnect pricing enquiry">
                <Mail className="h-4 w-4 mr-2" />
                Contact Us
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-slate-600 text-slate-200 hover:bg-slate-800 bg-transparent"
            >
              <a
                href="https://paypal.me/write2dinakar"
                target="_blank"
                rel="noopener noreferrer"
              >
                PayPal: paypal.me/write2dinakar
              </a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
