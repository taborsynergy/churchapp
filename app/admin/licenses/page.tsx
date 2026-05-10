'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Plus, Loader as Loader2 } from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
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

export default function LicensesAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
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

  async function updatePlan(id: string, plan: string) {
    setActing(id);
    const { error } = await supabase
      .from('licenses')
      .update({ plan, seat_limit: PLAN_SEATS[plan] ?? 200 })
      .eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Plan updated' }); load(); }
    setActing(null);
  }

  async function extendLicense(id: string) {
    const days = parseInt(extendDays, 10);
    if (!days || days < 1) return;
    setActing(id);
    const lic = licenses.find((l) => l.id === id);
    const base = lic?.expires_at ? new Date(lic.expires_at) : new Date();
    const newExpiry = addDays(base, days);
    const { error } = await supabase
      .from('licenses')
      .update({ expires_at: newExpiry.toISOString(), status: 'active' })
      .eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Extended by ${days} days` }); setExtendId(null); load(); }
    setActing(null);
  }

  const statusColor: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
    trial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    grace: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    expired: 'bg-red-500/10 text-red-400 border-red-500/20',
    suspended: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  if (authLoading || user?.email !== SUPER_ADMIN_EMAIL) return null;

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

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse" />)}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  {['Church', 'Plan', 'Status', 'Seats', 'Expires', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {licenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-white">{lic.church_name}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={lic.plan}
                        onValueChange={(v) => updatePlan(lic.id, v)}
                        disabled={acting === lic.id}
                      >
                        <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-700 text-white w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            { value: 'starter', label: 'Grow (100)' },
                            { value: 'church',  label: 'Parish (300)' },
                            { value: 'diocese', label: 'Diocese (500)' },
                            { value: 'network', label: 'Network (1000)' },
                          ].map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor[lic.status] ?? ''}`}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {lic.seat_limit >= 999999 ? '∞' : lic.seat_limit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {lic.expires_at
                        ? format(new Date(lic.expires_at), 'd MMM yyyy')
                        : lic.trial_ends_at
                          ? `Trial ends ${format(new Date(lic.trial_ends_at), 'd MMM yyyy')}`
                          : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {extendId === lic.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={extendDays}
                            onChange={(e) => setExtendDays(e.target.value)}
                            className="h-7 w-16 text-xs bg-slate-800 border-slate-700 text-white"
                          />
                          <span className="text-slate-500 text-xs">days</span>
                          <Button size="sm" className="h-7 text-xs bg-teal-500 hover:bg-teal-400 text-white" onClick={() => extendLicense(lic.id)} disabled={acting === lic.id}>
                            {acting === lic.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400" onClick={() => setExtendId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-teal-500/40 text-teal-400 hover:bg-teal-500/10" onClick={() => setExtendId(lic.id)}>
                          <Plus className="h-3 w-3 mr-1" />Extend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
