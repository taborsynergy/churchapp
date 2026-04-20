'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Users, Phone, Mail, Loader as Loader2 } from 'lucide-react';

export default function DirectoryPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading]);

  useEffect(() => {
    if (user && profile?.status === 'active') {
      supabase.from('users').select('*').eq('status', 'active').order('full_name').then(({ data }) => {
        setMembers(data ?? []);
        setLoading(false);
      });
    }
  }, [user, profile]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div>;
  }

  if (!user) return null;

  if (profile?.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="text-center max-w-sm">
          <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Member Directory</h2>
          <p className="text-slate-400">The member directory is available to active members. Your account is pending approval.</p>
        </div>
      </div>
    );
  }

  const filtered = members.filter((m) =>
    !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-gradient-to-br from-slate-900 to-teal-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3">Community</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Member Directory</h1>
          <p className="text-slate-300">Connect with your fellow members at Grace Community Church.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((member) => {
              const initials = member.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
              return (
                <Card key={member.id} className="border-slate-700/50 bg-slate-900 hover:border-teal-500/30 hover:shadow-md transition-all duration-300">
                  <CardContent className="p-5 text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-3">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback className="bg-teal-500/20 text-teal-400 font-semibold text-lg">{initials}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-white text-sm">{member.full_name}</h3>
                    <Badge className={`text-xs mt-1.5 capitalize ${member.role === 'admin' ? 'bg-red-500/20 text-red-400' : member.role === 'staff' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                      {member.role}
                    </Badge>
                    {member.bio && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{member.bio}</p>}
                    <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1.5">
                      {member.phone && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[140px]">{member.email}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
