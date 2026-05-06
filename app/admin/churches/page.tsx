'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Building2, Search, ShieldAlert, CheckCircle, Loader as Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const SUPER_ADMIN_EMAIL = 'admin@taborsynergy.com';

interface Church {
  id: string;
  name: string;
  admin_email: string;
  member_count: number;
  plan: string;
  license_status: string;
  created_at: string;
}

export default function ChurchesAdminPage() {
  const { user, session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.email !== SUPER_ADMIN_EMAIL)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.email !== SUPER_ADMIN_EMAIL) return;
    loadChurches();
  }, [user]);

  async function loadChurches() {
    setLoading(true);
    const { data } = await supabase
      .from('churches')
      .select('*, licenses(plan, status)')
      .order('created_at', { ascending: false });

    setChurches(
      (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        admin_email: c.admin_email ?? '',
        member_count: c.member_count ?? 0,
        plan: c.licenses?.[0]?.plan ?? 'none',
        license_status: c.licenses?.[0]?.status ?? 'none',
        created_at: c.created_at,
      }))
    );
    setLoading(false);
  }

  async function toggleSuspend(church: Church) {
    const isSuspended = church.license_status === 'suspended';
    setActing(church.id);
    const { error } = await supabase
      .from('licenses')
      .update({ status: isSuspended ? 'active' : 'suspended' })
      .eq('church_id', church.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: isSuspended ? 'Church reactivated' : 'Church suspended' });
      loadChurches();
    }
    setActing(null);
  }

  const filtered = churches.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.admin_email.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
    trial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    grace: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    expired: 'bg-red-500/10 text-red-400 border-red-500/20',
    suspended: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    none: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  if (authLoading) return null;
  if (user?.email !== SUPER_ADMIN_EMAIL) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-6 w-6 text-teal-400" />
              <h1 className="text-2xl font-bold">All Churches</h1>
            </div>
            <p className="text-slate-400 text-sm">Tabor Synergy super-admin view</p>
          </div>
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {churches.length} churches
          </Badge>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by church name or admin email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No churches found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  {['Church', 'Admin Email', 'Plan', 'Status', 'Members', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{c.name}</td>
                    <td className="px-4 py-3 text-slate-400">{c.admin_email}</td>
                    <td className="px-4 py-3 capitalize text-slate-300">{c.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor[c.license_status] ?? statusColor.none}`}>
                        {c.license_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.member_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{format(new Date(c.created_at), 'd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acting === c.id}
                        onClick={() => toggleSuspend(c)}
                        className={`text-xs border ${c.license_status === 'suspended' ? 'border-green-500/40 text-green-400 hover:bg-green-500/10' : 'border-red-500/40 text-red-400 hover:bg-red-500/10'}`}
                      >
                        {acting === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : c.license_status === 'suspended' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" />Reactivate</>
                        ) : (
                          <><ShieldAlert className="h-3 w-3 mr-1" />Suspend</>
                        )}
                      </Button>
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
