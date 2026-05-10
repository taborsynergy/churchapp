'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GivingFund } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { HandHeart, Shield, Heart, RefreshCw, Loader as Loader2, IndianRupee, DollarSign } from 'lucide-react';
import { AuthGuard } from '@/components/ui/auth-guard';
import { PendingApprovalScreen } from '@/components/ui/pending-approval';

type Currency = 'INR' | 'USD';

const PRESET_AMOUNTS: Record<Currency, number[]> = {
  INR: [500, 1000, 2500, 5000, 10000],
  USD: [10, 25, 50, 100, 250],
};

const SUPABASE_FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('rzp-script')) { resolve(); return; }
    const s = document.createElement('script');
    s.id = 'rzp-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

export default function GivePage() {
  const { user, session, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [funds, setFunds] = useState<GivingFund[]>([]);
  const [fundTotals, setFundTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedFund, setSelectedFund] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [paymentType, setPaymentType] = useState<'one_time' | 'recurring'>('one_time');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donated, setDonated] = useState(false);

  // Guests are intentionally allowed — PendingApprovalScreen guards active-member check below
  useEffect(() => {
    async function load() {
      const [{ data: f }, { data: d }] = await Promise.all([
        supabase.from('giving_funds').select('*').eq('is_active', true),
        supabase.from('donations').select('fund_id, amount').eq('status', 'completed'),
      ]);
      setFunds(f ?? []);
      if (f && f.length > 0) setSelectedFund(f[0].id);
      const totals: Record<string, number> = {};
      (d ?? []).forEach((don: { fund_id: string | null; amount: number }) => {
        if (don.fund_id) totals[don.fund_id] = (totals[don.fund_id] ?? 0) + Number(don.amount);
      });
      setFundTotals(totals);
      setLoading(false);
    }
    load();
    if (profile) {
      setDonorName(profile.full_name ?? '');
      setDonorEmail(profile.email ?? '');
    }
  }, [profile]);

  // Reset preset on currency change
  useEffect(() => { setAmount(''); }, [currency]);

  const selectedFundName = funds.find((f) => f.id === selectedFund)?.name ?? 'General Fund';

  async function handleGive(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount < (currency === 'INR' ? 1 : 1)) {
      toast({ title: 'Invalid amount', description: `Minimum donation is ${currency === 'INR' ? '₹1' : '$1'}.`, variant: 'destructive' });
      return;
    }
    if (!selectedFund) {
      toast({ title: 'Please select a fund', variant: 'destructive' });
      return;
    }

    setCheckoutLoading(true);
    try {
      if (currency === 'INR') {
        await handleRazorpay(numAmount);
      } else {
        await handleStripe(numAmount);
      }
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleRazorpay(numAmount: number) {
    try {
      await loadRazorpayScript();
    } catch {
      toast({ title: 'Payment error', description: 'Could not load Razorpay. Check your connection.', variant: 'destructive' });
      return;
    }

    const amountPaise = Math.round(numAmount * 100);
    const res = await fetch('/api/give/razorpay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({
        amount: amountPaise,
        fund_id: selectedFund,
        fund_name: selectedFundName,
        payment_type: paymentType,
        donor_name: donorName,
        donor_email: donorEmail,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast({ title: 'Payment failed', description: data.error ?? 'Unable to initiate payment.', variant: 'destructive' });
      return;
    }

    const rzp = new window.Razorpay({
      key: data.key_id,
      amount: data.amount,
      currency: 'INR',
      order_id: data.order_id,
      name: 'ChurchConnect',
      description: `Donation to ${selectedFundName}`,
      prefill: { name: donorName, email: donorEmail },
      theme: { color: '#14b8a6' },
      handler: () => {
        setDonated(true);
        setAmount('');
        toast({ title: '🙏 Thank you!', description: 'Your donation has been received. A receipt will be emailed to you.' });
      },
    });
    rzp.open();
  }

  async function handleStripe(numAmount: number) {
    const amountCents = Math.round(numAmount * 100);
    const origin = window.location.origin;

    const res = await fetch(`${SUPABASE_FN}/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({
        amount: amountCents,
        fund_id: selectedFund,
        fund_name: selectedFundName,
        payment_type: paymentType,
        donor_name: donorName,
        donor_email: donorEmail,
        user_id: user?.id ?? '',
        success_url: `${origin}/give?success=1`,
        cancel_url: `${origin}/give`,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast({ title: 'Payment failed', description: data.error ?? 'Unable to initiate payment.', variant: 'destructive' });
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  if (!authLoading && user && profile?.status !== 'active') return <PendingApprovalScreen />;

  const symbol = currency === 'INR' ? '₹' : '$';
  const presets = PRESET_AMOUNTS[currency];

  return (<AuthGuard>
    <div className="min-h-screen bg-slate-950">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 mb-3">Generosity</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Give Online</h1>
          <p className="text-slate-300 max-w-xl">
            Your generosity makes ministry possible. Secure payments via Razorpay (INR) and Stripe (USD).
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {donated && (
          <div className="mb-8 p-5 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
            <Heart className="h-10 w-10 text-green-400 mx-auto mb-2" />
            <h3 className="font-bold text-green-400 text-lg">Thank You for Your Gift!</h3>
            <p className="text-green-300 text-sm mt-1">A receipt has been sent to {donorEmail}. May God bless you abundantly.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-2xl border border-slate-700/50 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Make a Donation</h2>
              <form onSubmit={handleGive} className="space-y-5">

                {/* Currency toggle */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Currency</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['INR', 'USD'] as Currency[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${currency === c ? 'bg-teal-500/10 border-teal-500 text-teal-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-teal-500/40'}`}
                      >
                        {c === 'INR' ? <IndianRupee className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                        {c} {c === 'INR' ? '(Razorpay)' : '(Stripe)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fund selector */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Select Fund</Label>
                  <Select value={selectedFund} onValueChange={setSelectedFund}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Choose a fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount presets */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Donation Amount ({currency})</Label>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {presets.map((a) => (
                      <button
                        key={a}
                        type="button"
                        aria-label={`Give ${symbol}${a}`}
                        aria-pressed={amount === a.toString()}
                        onClick={() => setAmount(a.toString())}
                        className={`py-2.5 rounded-lg text-sm font-semibold transition-colors border ${amount === a.toString() ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-teal-500/50'}`}
                      >
                        {symbol}{a >= 1000 ? `${a / 1000}k` : a}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{symbol}</span>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Other amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Frequency</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'one_time', label: 'One-Time Gift', icon: Heart },
                      { value: 'recurring', label: 'Monthly Giving', icon: RefreshCw },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPaymentType(opt.value as 'one_time' | 'recurring')}
                        className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium transition-all ${paymentType === opt.value ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-teal-500/30'}`}
                      >
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Donor info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 mb-1.5 block">Your Name</Label>
                    <Input autoComplete="name" placeholder="Full name" value={donorName} onChange={(e) => setDonorName(e.target.value)} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                  <div>
                    <Label className="text-slate-300 mb-1.5 block">Email (for receipt)</Label>
                    <Input type="email" autoComplete="email" placeholder="your@email.com" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold h-12 text-base" disabled={checkoutLoading || !amount}>
                  {checkoutLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <HandHeart className="h-5 w-5 mr-2" />}
                  {checkoutLoading ? 'Opening payment…' : `Give ${amount ? `${symbol}${parseFloat(amount).toLocaleString()}` : 'Now'} via ${currency === 'INR' ? 'Razorpay' : 'Stripe'}`}
                </Button>

                <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Shield className="h-3.5 w-3.5" />
                  Payments processed by {currency === 'INR' ? 'Razorpay' : 'Stripe'}. No card data touches our servers.
                </p>
              </form>
            </div>
          </div>

          {/* Fund cards */}
          <div className="space-y-5">
            {loading ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : (
              funds.map((fund) => {
                const raised = fundTotals[fund.id] ?? 0;
                const pct = fund.goal_amount ? Math.min(100, (raised / fund.goal_amount) * 100) : null;
                return (
                  <Card key={fund.id} className={`border-slate-700/50 bg-slate-900 cursor-pointer transition-all ${selectedFund === fund.id ? 'border-teal-500/30 bg-teal-500/5' : 'hover:border-teal-500/30'}`} onClick={() => setSelectedFund(fund.id)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-white">{fund.name}</h3>
                        {selectedFund === fund.id && <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs">Selected</Badge>}
                      </div>
                      {fund.description && <p className="text-xs text-slate-400 mb-3">{fund.description}</p>}
                      {pct !== null && (
                        <>
                          <div className="h-2 mb-2 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>${raised.toLocaleString()} raised</span>
                            <span>Goal: ${fund.goal_amount?.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
            <Card className="border-teal-500/20 bg-teal-500/10">
              <CardContent className="p-5">
                <p className="text-sm text-teal-300 italic leading-relaxed">
                  &ldquo;Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.&rdquo;
                </p>
                <p className="text-xs text-teal-400/70 mt-2 font-medium">— 2 Corinthians 9:7</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </AuthGuard>);
}
