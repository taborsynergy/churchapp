'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { HandHeart, DollarSign, Shield, Heart, RefreshCw, Loader as Loader2 } from 'lucide-react';
import { PendingApprovalScreen } from '@/components/ui/pending-approval';

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export default function GivePage() {
  const router = useRouter();
  const { user, session, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading]);
  const [funds, setFunds] = useState<GivingFund[]>([]);
  const [fundTotals, setFundTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedFund, setSelectedFund] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'one_time' | 'recurring'>('one_time');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donated, setDonated] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: f }, { data: d }] = await Promise.all([
        supabase.from('giving_funds').select('*').eq('is_active', true),
        supabase.from('donations').select('fund_id, amount').eq('status', 'completed'),
      ]);
      setFunds(f ?? []);
      if (f && f.length > 0) setSelectedFund(f[0].id);
      const totals: Record<string, number> = {};
      (d ?? []).forEach((don: any) => {
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

  async function handleGive(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid donation amount.', variant: 'destructive' });
      return;
    }
    if (numAmount > 100000) {
      toast({ title: 'Amount too large', description: 'Maximum single donation is $100,000. Please contact the church office for larger gifts.', variant: 'destructive' });
      return;
    }
    if (!selectedFund) {
      toast({ title: 'Please select a fund', variant: 'destructive' });
      return;
    }
    setCheckoutLoading(true);

    try {
      const res = await fetch('/api/give', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          fund_id: selectedFund,
          amount: numAmount,
          payment_type: paymentType,
          donor_name: donorName || (profile?.full_name ?? 'Anonymous'),
          donor_email: donorEmail || (user?.email ?? ''),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Donation failed', description: data.error ?? 'Unable to record donation. Please try again.', variant: 'destructive' });
      } else {
        setDonated(true);
        setAmount('');
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
    setCheckoutLoading(false);
  }

  if (!authLoading && user && profile?.status !== 'active') {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-4">
        <p className="text-center text-amber-400 text-sm font-semibold">
          DEMO MODE — No real payments are processed. All donations are simulated for demonstration purposes only.
        </p>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 mb-3">Generosity</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Give Online</h1>
          <p className="text-slate-300 max-w-xl">Your generosity makes ministry possible. Every gift, large or small, helps us reach our community and beyond with the love of Christ.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {donated && (
          <div className="mb-8 p-5 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
            <Heart className="h-10 w-10 text-green-400 mx-auto mb-2" />
            <h3 className="font-bold text-green-400 text-lg">Thank You for Your Gift!</h3>
            <p className="text-green-300 text-sm mt-1">Your generosity makes a real difference. May God bless you abundantly.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-sm p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Make a Donation</h2>
              <form onSubmit={handleGive} className="space-y-5">
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

                <div>
                  <Label className="text-slate-300 mb-2 block">Donation Amount</Label>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {PRESET_AMOUNTS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        aria-label={`Give $${a}`}
                        aria-pressed={amount === a.toString()}
                        onClick={() => setAmount(a.toString())}
                        className={`py-2.5 rounded-lg text-sm font-semibold transition-colors border ${amount === a.toString() ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-teal-500/50'}`}
                      >
                        ${a}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Other amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 mb-1.5 block">Your Name</Label>
                    <Input autoComplete="name" placeholder="Full name" value={donorName} onChange={(e) => setDonorName(e.target.value)} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                  <div>
                    <Label className="text-slate-300 mb-1.5 block">Email</Label>
                    <Input type="email" autoComplete="email" placeholder="your@email.com" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold h-12 text-base" disabled={checkoutLoading}>
                  {checkoutLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <HandHeart className="h-5 w-5 mr-2" />}
                  {checkoutLoading ? 'Processing...' : `Give ${amount ? `$${parseFloat(amount).toFixed(2)}` : 'Now'}`}
                </Button>
                <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Shield className="h-3.5 w-3.5" /> All donations are securely recorded. Demo mode active.
                </p>
              </form>
            </div>
          </div>

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
                          <div className="h-2 mb-2 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.min(pct ?? 0, 100)}%` }} /></div>
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>${raised.toLocaleString()} raised</span>
                            <span>Goal: ${fund.goal_amount?.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      {pct === null && raised > 0 && (
                        <p className="text-sm font-medium text-green-400">${raised.toLocaleString()} raised</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}

            <Card className="border-teal-500/20 bg-teal-500/10">
              <CardContent className="p-5">
                <h3 className="font-semibold text-teal-400 mb-2">Why Give?</h3>
                <p className="text-sm text-teal-300 leading-relaxed">
                  &ldquo;Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.&rdquo;
                </p>
                <p className="text-xs text-teal-400/70 mt-2 font-medium">— 2 Corinthians 9:7</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
