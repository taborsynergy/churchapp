'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Users, DollarSign, Clock, TrendingUp,
  Zap, Ban, Plus, RefreshCw, Mail, AlertTriangle,
  CheckCircle, XCircle, Timer, Building2
} from 'lucide-react';
import { format, differenceInDays, addDays, isPast } from 'date-fns';

const OWNER_EMAIL = 'write2dinakar10@gmail.com';

const PLANS = [
  { value: 'starter',  label: 'Grow',    price: 29,  seats: 100  },
  { value: 'church',   label: 'Parish',  price: 49,  seats: 300  },
  { value: 'diocese',  label: 'Diocese', price: 99,  seats: 500  },
  { value: 'network',  label: 'Network', price: 149, seats: 1000 },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  active:    { color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  icon: '✅' },
  trial:     { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',    icon: '🔵' },
  grace:     { color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  icon: '⚠️' },
  expired:   { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',      icon: '❌' },
  suspended: { color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20',  icon: '🚫' },
};

interface Subscriber {
  id: string;
  church_id: string;
  church_name: string;
  admin_email: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  expires_at: string | null;
  seat_limit: number;
  created_at: string;
  paypal_subscription_id: string | null;
  member_count: number;
}

function TrialBadge({ trialEndsAt }: { trialEndsAt: string | null }) {
  if (!trialEndsAt) return null;
  const days = differenceInDays(new Date(trialEndsAt), new Date());
  if (days < 0) return <span className="text-xs text-red-400 font-semibold">Trial expired</span>;
  const color = days <= 2 ? 'text-red-400' : days <= 5 ? 'text-amber-400' : 'text-blue-400';
  return <span className={`text-xs font-semibold ${color}`}>⏱ {days}d left in trial</span>;
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return <span className="text-xs text-red-400">Expired {Math.abs(days)}d ago</span>;
  const color = days <= 7 ? 'text-red-400' : days <= 14 ? 'text-amber-400' : 'text-slate-400';
  return <span className={`text-xs ${color}`}>Expires {format(new Date(expiresAt), 'd MMM yyyy')} ({days}d)</span>;
}

export default function PlatformAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Action panel state
  const [activateId, setActivateId] = useState<string | null>(null);
  const [activatePlan, setActivatePlan] = useState('starter');
  const [activatePeriod, setActivatePeriod] = useState<'30' | '365'>('30');
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState('30');

  useEffect(() => {
    if (!authLoading && (!user || user.email !== OWNER_EMAIL)) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: licData } = await supabase
      .from('licenses')
      .select('*, churches(id, name, email)')
      .order('created_at', { ascending: false });

    if (!licData) { setLoading(false); return; }

    // Fetch all member counts in a single query instead of N per-church queries
    const churchIds = licData.map((l: any) => l.church_id).filter(Boolean);
    const { data: memberRows } = churchIds.length
      ? await supabase.from('church_users').select('church_id').in('church_id', churchIds)
      : { data: [] };
    const memberCountMap: Record<string, number> = {};
    (memberRows ?? []).forEach((m: any) => {
      memberCountMap[m.church_id] = (memberCountMap[m.church_id] || 0) + 1;
    });

    const rows: Subscriber[] = licData.map((l: any) => ({
      id: l.id,
      church_id: l.church_id,
      church_name: l.churches?.name ?? '—',
      admin_email: l.churches?.email ?? '—',
      plan: l.plan,
      status: l.status,
      trial_ends_at: l.trial_ends_at,
      expires_at: l.expires_at,
      seat_limit: l.seat_limit,
      created_at: l.created_at,
      paypal_subscription_id: l.paypal_subscription_id ?? null,
      member_count: memberCountMap[l.church_id] ?? 0,
    }));
    setSubscribers(rows);
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.email === OWNER_EMAIL) load(); }, [user, load]);

  const filtered = subscribers.filter(s => {
    const matchSearch = !search || s.church_name.toLowerCase().includes(search.toLowerCase()) || s.admin_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // KPI calculations
  const activeCount   = subscribers.filter(s => s.status === 'active').length;
  const trialCount    = subscribers.filter(s => s.status === 'trial').length;
  const expiredCount  = subscribers.filter(s => s.status === 'expired' || s.status === 'grace').length;
  const expiringIn7   = subscribers.filter(s => {
    if (s.status !== 'active' || !s.expires_at) return false;
    return differenceInDays(new Date(s.expires_at), new Date()) <= 7;
  }).length;
  const mrr = subscribers
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (PLANS.find(p => p.value === s.plan)?.price ?? 0), 0);
  const arr = mrr * 12;

  async function activateLicense(id: string) {
    setActing(id);
    const plan = PLANS.find(p => p.value === activatePlan)!;
    const days = parseInt(activatePeriod, 10);
    const expiry = addDays(new Date(), days);
    const { error } = await supabase
      .from('licenses')
      .update({ plan: activatePlan, seat_limit: plan.seats, status: 'active', expires_at: expiry.toISOString() })
      .eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Activated!', description: `${plan.label} — expires ${format(expiry, 'd MMM yyyy')}` }); setActivateId(null); load(); }
    setActing(null);
  }

  async function extendLicense(id: string) {
    const days = parseInt(extendDays, 10);
    if (!days || days < 1) return;
    setActing(id);
    const sub = subscribers.find(s => s.id === id);
    const base = sub?.expires_at && !isPast(new Date(sub.expires_at)) ? new Date(sub.expires_at) : new Date();
    const newExpiry = addDays(base, days);
    const { error } = await supabase
      .from('licenses')
      .update({ expires_at: newExpiry.toISOString(), status: 'active' })
      .eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Extended', description: `New expiry: ${format(newExpiry, 'd MMM yyyy')}` }); setExtendId(null); load(); }
    setActing(null);
  }

  async function suspendLicense(id: string) {
    if (!confirm('Suspend this church? They will lose access immediately.')) return;
    setActing(id);
    const { error } = await supabase.from('licenses').update({ status: 'suspended' }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: '🚫 Suspended' }); load(); }
    setActing(null);
  }

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <RefreshCw className="h-6 w-6 text-teal-400 animate-spin" />
    </div>
  );

  if (!user || user.email !== OWNER_EMAIL) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-teal-400" />
            <div>
              <h1 className="text-lg font-bold text-white">ChurchConnect Platform Admin</h1>
              <p className="text-xs text-slate-400">Owner: {OWNER_EMAIL}</p>
            </div>
          </div>
          <Button onClick={load} variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Churches', value: subscribers.length, icon: <Building2 className="h-4 w-4" />, color: 'text-blue-400' },
            { label: 'Active Paid', value: activeCount, icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-400' },
            { label: 'On Trial', value: trialCount, icon: <Timer className="h-4 w-4" />, color: 'text-blue-400' },
            { label: 'Expired/Grace', value: expiredCount, icon: <XCircle className="h-4 w-4" />, color: 'text-red-400' },
            { label: 'MRR', value: `$${mrr.toLocaleString()}`, icon: <DollarSign className="h-4 w-4" />, color: 'text-teal-400' },
            { label: 'ARR', value: `$${arr.toLocaleString()}`, icon: <TrendingUp className="h-4 w-4" />, color: 'text-violet-400' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className={`flex items-center gap-1.5 ${kpi.color} mb-2`}>{kpi.icon}<span className="text-xs font-semibold uppercase tracking-wide">{kpi.label}</span></div>
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Expiring Soon Banner */}
        {expiringIn7 > 0 && (
          <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-amber-300 text-sm font-medium">{expiringIn7} church{expiringIn7 > 1 ? 'es' : ''} expiring within 7 days — consider sending renewal reminders.</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            placeholder="Search church or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-9 text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {['all', 'trial', 'active', 'grace', 'expired', 'suspended'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filterStatus === s ? 'bg-teal-500 text-white' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}
              >
                {s === 'all' ? `All (${subscribers.length})` : `${s} (${subscribers.filter(x => x.status === s).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Subscriber Cards */}
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{search || filterStatus !== 'all' ? 'No results match your filter.' : 'No subscribers yet.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sub => {
              const planInfo = PLANS.find(p => p.value === sub.plan);
              const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.expired;
              const isNeedsActivation = ['trial', 'expired', 'suspended', 'grace'].includes(sub.status);
              const usagePct = sub.seat_limit > 0 ? Math.min(100, Math.round((sub.member_count / sub.seat_limit) * 100)) : 0;

              return (
                <div key={sub.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                  {/* Main row */}
                  <div className="p-4 flex flex-wrap items-start gap-4">

                    {/* Church info */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-base">{sub.church_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-semibold ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon} {sub.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Mail className="h-3 w-3" />{sub.admin_email}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        Joined {format(new Date(sub.created_at), 'd MMM yyyy')}
                        {sub.paypal_subscription_id && <span className="ml-2 text-teal-500">· PayPal: {sub.paypal_subscription_id.slice(0, 14)}...</span>}
                      </div>
                    </div>

                    {/* Plan & dates */}
                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <div className="text-sm font-semibold text-white">{planInfo?.label ?? sub.plan} Plan</div>
                      <div className="text-xs text-slate-400">${planInfo?.price ?? '—'}/mo · {sub.seat_limit} seats</div>
                      {sub.status === 'trial' && <TrialBadge trialEndsAt={sub.trial_ends_at} />}
                      {sub.status === 'active' && <ExpiryBadge expiresAt={sub.expires_at} />}
                    </div>

                    {/* Member usage */}
                    <div className="flex flex-col gap-1 min-w-[160px]">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Members</span>
                        <span className={usagePct >= 90 ? 'text-red-400 font-semibold' : 'text-slate-300'}>{sub.member_count} / {sub.seat_limit}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-teal-500'}`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500">{usagePct}% capacity used</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
                      {isNeedsActivation ? (
                        <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-500 text-white font-semibold"
                          onClick={() => { setExtendId(null); setActivateId(sub.id); setActivatePlan(sub.plan ?? 'starter'); setActivatePeriod('30'); }}
                          disabled={acting === sub.id}>
                          <Zap className="h-3 w-3 mr-1" /> Activate
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="h-8 text-xs border-teal-500/40 text-teal-400 hover:bg-teal-500/10"
                            onClick={() => { setActivateId(null); setExtendId(sub.id); setExtendDays('30'); }}
                            disabled={acting === sub.id}>
                            <Plus className="h-3 w-3 mr-1" /> Extend
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => suspendLicense(sub.id)} disabled={acting === sub.id}>
                            <Ban className="h-3 w-3 mr-1" /> Suspend
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Activate Panel */}
                  {activateId === sub.id && (
                    <div className="border-t border-slate-700 bg-slate-800/50 px-4 py-4">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Activate License</p>
                      <div className="flex flex-wrap items-end gap-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Plan</p>
                          <Select value={activatePlan} onValueChange={setActivatePlan}>
                            <SelectTrigger className="h-8 w-52 text-xs bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PLANS.map(p => <SelectItem key={p.value} value={p.value}>{p.label} — ${p.price}/mo ({p.seats} seats)</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Billing Period</p>
                          <div className="flex gap-2">
                            {(['30','365'] as const).map(d => (
                              <button key={d} onClick={() => setActivatePeriod(d)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activatePeriod === d ? 'bg-teal-500 text-white' : 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600'}`}>
                                {d === '30' ? 'Monthly (30d)' : 'Annual (365d)'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-500 text-white"
                            onClick={() => activateLicense(sub.id)} disabled={acting === sub.id}>
                            <Zap className="h-3 w-3 mr-1" /> Confirm
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400" onClick={() => setActivateId(null)}>Cancel</Button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Will set: {PLANS.find(p => p.value === activatePlan)?.label} plan · {PLANS.find(p => p.value === activatePlan)?.seats} seats · status=active · expires {format(addDays(new Date(), parseInt(activatePeriod)), 'd MMM yyyy')}
                      </p>
                    </div>
                  )}

                  {/* Extend Panel */}
                  {extendId === sub.id && (
                    <div className="border-t border-slate-700 bg-slate-800/50 px-4 py-4">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Extend License</p>
                      <div className="flex flex-wrap items-end gap-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Add Days</p>
                          <div className="flex items-center gap-2">
                            <Input type="number" value={extendDays} onChange={e => setExtendDays(e.target.value)}
                              className="h-8 w-20 text-xs bg-slate-700 border-slate-600 text-white" />
                            <div className="flex gap-1">
                              {[['30','1mo'],['90','3mo'],['180','6mo'],['365','1yr']].map(([d, label]) => (
                                <button key={d} onClick={() => setExtendDays(d)}
                                  className={`px-2 py-1 rounded text-xs transition-colors ${extendDays === d ? 'bg-teal-500 text-white' : 'bg-slate-700 border border-slate-600 text-slate-400 hover:text-white'}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-8 text-xs bg-teal-500 hover:bg-teal-400 text-white"
                            onClick={() => extendLicense(sub.id)} disabled={acting === sub.id}>
                            <Plus className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400" onClick={() => setExtendId(null)}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-8">ChurchConnect Platform Admin · Only accessible to {OWNER_EMAIL}</p>
      </div>
    </div>
  );
}
