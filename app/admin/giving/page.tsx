'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Donation, GivingFund } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Users, RefreshCw, Loader as Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function AdminGivingPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [funds, setFunds] = useState<GivingFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');

  useEffect(() => {
    async function load() {
      const [{ data: d }, { data: f }] = await Promise.all([
        supabase.from('donations').select('*, church_users(full_name, email), giving_funds(name)').eq('status', 'completed').order('created_at', { ascending: false }),
        supabase.from('giving_funds').select('*'),
      ]);
      setDonations(d ?? []);
      setFunds(f ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const filtered = donations.filter((d) => {
    const date = new Date(d.created_at);
    if (period === 'this_month') return date >= startOfMonth(now) && date <= endOfMonth(now);
    if (period === 'last_month') {
      const prev = subMonths(now, 1);
      return date >= startOfMonth(prev) && date <= endOfMonth(prev);
    }
    if (period === 'ytd') return date.getFullYear() === now.getFullYear();
    return true;
  });

  const totalFiltered = filtered.reduce((s, d) => s + Number(d.amount), 0);
  const uniqueDonors = new Set(filtered.map((d) => d.user_id ?? d.donor_email)).size;
  const recurringCount = filtered.filter((d) => d.payment_type === 'recurring').length;

  const byFund = funds.map((f) => ({
    fund: f,
    total: filtered.filter((d) => d.fund_id === f.id).reduce((s, d) => s + Number(d.amount), 0),
    count: filtered.filter((d) => d.fund_id === f.id).length,
  })).sort((a, b) => b.total - a.total);

  const PERIOD_OPTIONS = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'all', label: 'All Time' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div>;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Giving Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Track donations across all funds and giving campaigns.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {PERIOD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-white">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Received', value: `$${totalFiltered.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Donations', value: filtered.length, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10' },
          { label: 'Donors', value: uniqueDonors, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Recurring', value: recurringCount, icon: RefreshCw, color: 'text-teal-400', bg: 'bg-teal-500/10' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-800/60 border border-slate-700/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-slate-900 border border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Giving by Fund</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {byFund.length === 0 ? <p className="text-sm text-slate-500">No donations in this period.</p> : (
              <div className="space-y-4">
                {byFund.map(({ fund, total, count }) => (
                  <div key={fund.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-200">{fund.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{count} gifts</span>
                        <span className="text-sm font-bold text-white">${total.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${totalFiltered > 0 ? Math.min((total / totalFiltered) * 100, 100) : 0}%` }} /></div>
                    {fund.goal_amount && (
                      <p className="text-xs text-slate-500 mt-1">
                        ${total.toLocaleString()} of ${fund.goal_amount.toLocaleString()} goal ({Math.round((total / fund.goal_amount) * 100)}%)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Recent Donations</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filtered.slice(0, 20).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{d.is_anonymous ? 'Anonymous' : (d.users as any)?.full_name ?? d.donor_name}</p>
                    <p className="text-xs text-slate-500">{(d.giving_funds as any)?.name} · {format(new Date(d.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-400">${Number(d.amount).toFixed(2)}</p>
                    <Badge className={`text-xs ${d.payment_type === 'recurring' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'}`}>
                      {d.payment_type === 'recurring' ? 'Monthly' : 'One-time'}
                    </Badge>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-sm text-slate-500 py-4 text-center">No donations in this period.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Full Transaction Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900">
                  <th className="text-left px-5 py-3 font-semibold text-slate-400">Donor</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Fund</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 hidden sm:table-cell">Date</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((d) => (
                  <tr key={d.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{d.is_anonymous ? 'Anonymous' : ((d.users as any)?.full_name ?? d.donor_name ?? 'Guest')}</p>
                      <p className="text-xs text-slate-500">{d.donor_email || (d.users as any)?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{(d.giving_funds as any)?.name ?? 'General'}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${d.payment_type === 'recurring' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'}`}>
                        {d.payment_type === 'recurring' ? 'Monthly' : 'One-time'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{format(new Date(d.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-400">${Number(d.amount).toFixed(2)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-500">No transactions in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
