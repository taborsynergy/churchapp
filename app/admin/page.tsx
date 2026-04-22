'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, Calendar, Heart, DollarSign, Megaphone, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { UserProfile, Donation } from '@/lib/types';

interface Stats {
  totalMembers: number;
  pendingMembers: number;
  totalSermons: number;
  upcomingEvents: number;
  openPrayers: number;
  totalDonations: number;
  monthDonations: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { profile: currentProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && currentProfile && currentProfile.role !== 'admin') {
      router.replace('/admin/sermons');
    }
  }, [currentProfile, authLoading]);

  const [stats, setStats] = useState<Stats>({ totalMembers: 0, pendingMembers: 0, totalSermons: 0, upcomingEvents: 0, openPrayers: 0, totalDonations: 0, monthDonations: 0 });
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);

      const [
        { count: totalMembers },
        { count: pendingMembers },
        { count: totalSermons },
        { count: upcomingEvents },
        { count: openPrayers },
        { data: allDonations },
        { data: users },
        { data: donations },
      ] = await Promise.all([
        supabase.from('church_users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('church_users').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('sermons').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('start_date', new Date().toISOString()),
        supabase.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('donations').select('amount').eq('status', 'completed'),
        supabase.from('church_users').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('donations').select('*, church_users(full_name), giving_funds(name)').eq('status', 'completed').order('created_at', { ascending: false }).limit(6),
      ]);

      const totalDonations = (allDonations ?? []).reduce((s: number, d: any) => s + Number(d.amount), 0);
      const monthDonations = (allDonations ?? []).filter((d: any) => new Date(d.created_at ?? '') >= firstOfMonth).reduce((s: number, d: any) => s + Number(d.amount), 0);

      setStats({ totalMembers: totalMembers ?? 0, pendingMembers: pendingMembers ?? 0, totalSermons: totalSermons ?? 0, upcomingEvents: upcomingEvents ?? 0, openPrayers: openPrayers ?? 0, totalDonations, monthDonations });
      setRecentUsers(users ?? []);
      setRecentDonations(donations ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const STAT_CARDS = [
    { label: 'Active Members', value: stats.totalMembers, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10', sub: stats.pendingMembers > 0 ? `${stats.pendingMembers} pending approval` : '' },
    { label: 'Published Sermons', value: stats.totalSermons, icon: BookOpen, color: 'text-teal-400', bg: 'bg-teal-500/10', sub: 'Total in library' },
    { label: 'Upcoming Events', value: stats.upcomingEvents, icon: Calendar, color: 'text-teal-400', bg: 'bg-teal-500/10', sub: 'Scheduled ahead' },
    { label: 'Open Prayer Requests', value: stats.openPrayers, icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10', sub: 'Awaiting prayer' },
    { label: 'Total Giving', value: `$${stats.totalDonations.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', sub: 'All time' },
    { label: 'This Month', value: `$${stats.monthDonations.toLocaleString()}`, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10', sub: 'Donations received' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Welcome back. Here&apos;s an overview of Grace Community Church.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {STAT_CARDS.map((card, i) => (
          <Card key={i} className="bg-slate-800/60 border border-slate-700/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{loading ? '—' : card.value}</p>
                  {card.sub && <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between text-white">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-teal-400" />Recent Registrations</span>
              {stats.pendingMembers > 0 && <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs">{stats.pendingMembers} pending</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {recentUsers.length === 0 ? <p className="text-sm text-slate-500">No recent registrations.</p> : (
              <div className="space-y-3">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{u.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs'}>
                        {u.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <DollarSign className="h-4 w-4 text-teal-400" />Recent Donations
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {recentDonations.length === 0 ? <p className="text-sm text-slate-500">No donations yet.</p> : (
              <div className="space-y-3">
                {recentDonations.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{d.is_anonymous ? 'Anonymous' : (d.users as any)?.full_name ?? d.donor_name}</p>
                      <p className="text-xs text-slate-500">{(d.giving_funds as any)?.name ?? 'General Fund'} · {format(new Date(d.created_at), 'MMM d')}</p>
                    </div>
                    <p className="font-semibold text-emerald-400">${Number(d.amount).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
