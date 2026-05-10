'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Plus, Zap, Ban, Loader as Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';

const SUPER_ADMIN_EMAIL = 'admin@taborsynergy.com';

interface LicenseRow {
  id: string;
  church_name: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  expires_at: string | null;
  seat_limit: number;
}

const PLAN_SEATS: Record<string, number> = { starter: 100, church: 300, diocese: 500, network: 1000 };

const PLANS = [
  { value: 'starter', label: 'Grow (100 seats)' },
  { value: 'church',  label: 'Parish (300 seats)' },
  { value: 'diocese', label: 'Diocese (500 seats)' },
  { value: 'network', label: 'Network (1,000 seats)' },
];

const STATUS_COLOR: Record<string, string> = {
  active:    'bg-green-500/10 text-green-400 border-green-500/20',
  trial:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  grace:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  expired:   'bg-red-500/10 text-red-400 border-red-500/20',
  suspended: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function LicensesAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Activate panel state
  const [activateId, setActivateId] = useState<string | null>(null);
  const [activatePlan, setActivatePlan] = useState('starter');
  const [activatePeriod, setActivatePeriod] = useState<'30' | '365'>('30');

  // Extend panel state
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState('30');

  useEffect(() => {
    if (!authLoading && (!user || user.email !== SUPER_ADMIN_EMAIL)) router.replace('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.email !== SUPER_ADMIN_EMAIL) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('licenses')
      .select('*, churches(name)')
      .order('created_at', { ascending: false });
    setLicenses(
      (data ?? []).map((l: any) => ({
        id: l.id,
        church_name: l.churches?.name ?? '—',
        plan: l.plan,
        status: l.status,
        trial_ends_at: l.trial_ends_at,
        expires_at: l.expires_at,
        seat_limit: l.seat_limit,
      }))
    );
    setLoading(false);
  }

  function openActivate(lic: LicenseRow) {
    setExtendId(null);
    setActivateId(lic.id);
    setActivatePlan(lic.plan ?? 'starter');
    setActivatePeriod('30');
  }

  function openExtend(licId: string) {
    setActivateId(null);
    setExtendId(licId);
    setExtendDays('30');
  }

  async function activateLicense(id: string) {
    setActing(id);
    const days = parseInt(activatePeriod, 10);
    const expiry = addDays(new Date(), days);
    const { error } = await supabase
      .from('licenses')
      .update({
        plan: activatePlan,
        seat_limit: PLAN_SEATS[activatePlan] ?? 100,
        status: 'active',
        expires_at: expiry.toISOString(),
      })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const planLabel = PLANS.find((p) => p.value === activatePlan)?.label ?? activatePlan;
      toast({ title: `Activated!`, description: `${planLabel} — expires ${format(expiry, 'd MMM yyyy')}` });
      setActivateId(null);
      load();
    }
    setActing(null);
  }

  async function extendLicense(id: string) {
    const days = parseInt(extendDays, 10);
    if (!days || days < 1) return;
    setActing(id);
    const lic = licenses.find((l) => l.id === id);
    const base = lic?.expires_at && new Date(lic.expires_at) > new Date() ? new Date(lic.expires_at) : new Date();
    const newExpiry = addDays(base, days);
    const { error } = await supabase
      .from('licenses')
      .update({ expires_at: newExpiry.toISOString(), status: 'active' })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Extended`, description: `Expires ${format(newExpiry, 'd MMM yyyy')}` });
      setExtendId(null);
      load();
    }
    setActing(null);
  }

  async function suspendLicense(id: string) {
    setActing(id);
    const { error } = await supabase
      .from('licenses')
      .update({ status: 'suspended' })
      .eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Suspended' }); load(); }
    setActing(null);
  }

  if (authLoading || user?.email !== SUPER_ADMIN_EMAIL) return null;

  const needsActivation = (status: string) => ['trial', 'expired', 'suspended'].includes(status);

  return (
    <div className="min-h-screen bg-slate-950 text-white py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="h-6 w-6 text-teal-400" />
          <div>
            <h1 className="text-2xl font-bold">Licence Management</h1>
            <p className="text-slate-400 text-sm">Tabor Synergy super-admin — manage all church licences</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6 text-xs text-slate-400">
          <span><span className="text-green-400 font-semibold">Activate</span> — customer paid, grant access</span>
          <span><span className="text-teal-400 font-semibold">Extend</span> — add more days to active licence</span>
          <span><span className="text-red-400 font-semibold">Suspend</span> — immediately revoke access</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse" />)}
          </div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No licences found.</div>
        ) : (
          <div className="space-y-3">
            {licenses.map((lic) => (
              <div key={lic.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                {/* Row */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Church name */}
                  <div className="min-w-[180px] flex-1">
                    <p className="font-semibold text-white">{lic.church_name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {lic.expires_at
                        ? `Expires ${format(new Date(lic.expires_at), 'd MMM yyyy')}`
                        : lic.trial_ends_at
                          ? `Trial ends ${format(new Date(lic.trial_ends_at), 'd MMM yyyy')}`
                          : 'No expiry set'}
                    </p>
                  </div>

                  {/* Plan */}
                  <div className="text-sm text-slate-300">
                    <span className="text-slate-500 text-xs mr-1">Plan</span>
                    {PLANS.find((p) => p.value === lic.plan)?.label ?? lic.plan}
                  </div>

                  {/* Seats */}
                  <div className="text-sm text-slate-300">
                    <span className="text-slate-500 text-xs mr-1">Seats</span>
                    {lic.seat_limit >= 999999 ? '∞' : lic.seat_limit.toLocaleString()}
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs px-2.5 py-1 rounded-full border capitalize font-medium ${STATUS_COLOR[lic.status] ?? ''}`}>
                    {lic.status}
                  </span>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 ml-auto">
                    {needsActivation(lic.status) ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-green-600 hover:bg-green-500 text-white font-semibold"
                        onClick={() => openActivate(lic)}
                        disabled={acting === lic.id}
                      >
                        {acting === lic.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                        Activate
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-teal-500/40 text-teal-400 hover:bg-teal-500/10"
                          onClick={() => openExtend(lic.id)}
                          disabled={acting === lic.id}
                        >
                          <Plus className="h-3 w-3 mr-1" />Extend
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => suspendLicense(lic.id)}
                          disabled={acting === lic.id}
                        >
                          {acting === lic.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3 mr-1" />}
                          Suspend
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Activate panel */}
                {activateId === lic.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-xs font-medium">Plan</span>
                      <Select value={activatePlan} onValueChange={setActivatePlan}>
                        <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-white w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-xs font-medium">Period</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setActivatePeriod('30')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activatePeriod === '30' ? 'bg-teal-500 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        >
                          Monthly (30 days)
                        </button>
                        <button
                          onClick={() => setActivatePeriod('365')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activatePeriod === '365' ? 'bg-teal-500 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        >
                          Annual (365 days)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-end gap-2 mt-auto">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-green-600 hover:bg-green-500 text-white font-semibold"
                        onClick={() => activateLicense(lic.id)}
                        disabled={acting === lic.id}
                      >
                        {acting === lic.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                        Confirm Activate
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400" onClick={() => setActivateId(null)}>
                        Cancel
                      </Button>
                    </div>

                    <p className="w-full text-xs text-slate-500 mt-1">
                      Sets plan to <span className="text-slate-300">{PLANS.find(p => p.value === activatePlan)?.label}</span>, {' '}
                      seat limit to <span className="text-slate-300">{PLAN_SEATS[activatePlan]}</span>, {' '}
                      status to <span className="text-green-400">active</span>, {' '}
                      expires <span className="text-slate-300">{format(addDays(new Date(), parseInt(activatePeriod, 10)), 'd MMM yyyy')}</span>.
                    </p>
                  </div>
                )}

                {/* Extend panel */}
                {extendId === lic.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-xs font-medium">Add days</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={extendDays}
                          onChange={(e) => setExtendDays(e.target.value)}
                          className="h-8 w-20 text-xs bg-slate-800 border-slate-700 text-white"
                        />
                        <span className="text-slate-500 text-xs">days</span>
                        <div className="flex gap-1">
                          {['30', '90', '180', '365'].map((d) => (
                            <button
                              key={d}
                              onClick={() => setExtendDays(d)}
                              className={`px-2 py-1 rounded text-xs transition-colors ${extendDays === d ? 'bg-teal-500 text-white' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}
                            >
                              {d === '30' ? '1mo' : d === '90' ? '3mo' : d === '180' ? '6mo' : '1yr'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 mt-auto">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-teal-500 hover:bg-teal-400 text-white"
                        onClick={() => extendLicense(lic.id)}
                        disabled={acting === lic.id}
                      >
                        {acting === lic.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        Save Extension
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400" onClick={() => setExtendId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
