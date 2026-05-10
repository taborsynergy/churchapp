'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Group } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, MapPin, Clock, Check, Loader as Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/ui/auth-guard';
import { PendingApprovalScreen } from '@/components/ui/pending-approval';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', bible_study: 'Bible Study', youth: 'Youth', women: 'Women',
  men: 'Men', couples: 'Couples', seniors: 'Seniors', outreach: 'Outreach',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-slate-700 text-slate-200', bible_study: 'bg-teal-500/20 text-teal-400',
  youth: 'bg-emerald-500/20 text-emerald-400', women: 'bg-pink-500/20 text-pink-400',
  men: 'bg-blue-500/20 text-blue-400', couples: 'bg-rose-500/20 text-rose-400',
  seniors: 'bg-orange-500/20 text-orange-400', outreach: 'bg-green-500/20 text-green-400',
};

export default function GroupsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState<string | null>(null);
  const [category, setCategory] = useState('all');

  async function load() {
    try {
      const [groupsResp, { data: m }] = await Promise.all([
        fetch('/api/groups'),
        user ? supabase.from('group_members').select('group_id').eq('user_id', user.id) : Promise.resolve({ data: [] as any[] }),
      ]);
      const groupsJson = await groupsResp.json();
      setGroups(groupsJson.groups ?? []);
      setMyGroupIds((m ?? []).map((x: any) => x.group_id));
    } catch {
      setGroups([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function handleJoin(groupId: string) {
    if (!user || !profile) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    if (profile.status !== 'active') {
      toast({ title: 'Account pending', description: 'Your account must be approved.', variant: 'destructive' });
      return;
    }
    const isLeaving = myGroupIds.includes(groupId);
    setJoinLoading(groupId);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ group_id: groupId, action: isLeaving ? 'leave' : 'join' }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || 'Failed', variant: 'destructive' });
    } else if (isLeaving) {
      setMyGroupIds(myGroupIds.filter((id) => id !== groupId));
      toast({ title: 'Left group' });
    } else {
      setMyGroupIds([...myGroupIds, groupId]);
      toast({ title: 'You joined the group!', description: 'The group leader will be in touch soon.' });
    }
    setJoinLoading(null);
    load();
  }

  if (!loading && user && profile && profile.status !== 'active') return <PendingApprovalScreen />;

  const filtered = groups.filter((g) => category === 'all' || g.category === category);

  return (<AuthGuard>
    <div className="min-h-screen bg-slate-950">
      <div className="bg-gradient-to-br from-slate-900 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">Community</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Small Groups</h1>
          <p className="text-slate-300 max-w-xl">Life is better in community. Find a small group that fits your season of life and start building deeper connections with your church family.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-8 justify-between items-start sm:items-center">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${category === 'all' ? 'bg-teal-500 text-white font-semibold' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              All Groups
            </button>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setCategory(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${category === k ? 'bg-teal-500 text-white font-semibold' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{category === 'all' ? 'No groups available yet' : 'No groups in this category yet'}</p>
            <p className="text-sm mt-1">Check back soon or try a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((group) => {
              const isMember = myGroupIds.includes(group.id);
              const memberCount = (group.group_members ?? []).length;

              return (
                <Card key={group.id} className="overflow-hidden border-slate-700/50 bg-slate-900 hover:border-teal-500/30 hover:shadow-lg transition-all duration-300">
                  <div className="h-36 bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
                    {group.image_url ? (
                      <img src={group.image_url} alt={group.name} className="w-full h-full object-cover opacity-70" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="h-12 w-12 text-slate-500/30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[group.category] || CATEGORY_COLORS.general}`}>
                        {CATEGORY_LABELS[group.category]}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-bold text-white text-base mb-1">{group.name}</h3>
                    {group.description && <p className="text-sm text-slate-400 line-clamp-2 mb-3">{group.description}</p>}
                    <div className="space-y-1.5 mb-4">
                      {group.meeting_time && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{group.meeting_time}</span>
                        </div>
                      )}
                      {group.location && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{group.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{memberCount} member{memberCount !== 1 ? 's' : ''}{group.max_members ? ` / ${group.max_members} max` : ''}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className={`w-full ${isMember ? 'bg-green-600 hover:bg-red-600 text-white' : 'bg-teal-500 hover:bg-teal-400 text-white font-semibold'}`}
                      onClick={() => handleJoin(group.id)}
                      disabled={joinLoading === group.id}
                    >
                      {joinLoading === group.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : isMember ? <Check className="h-4 w-4 mr-2" /> : null}
                      {isMember ? 'Joined (Leave)' : 'Join Group'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </AuthGuard>);
}
