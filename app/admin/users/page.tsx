'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole, UserStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Search, UserCheck, UserX, Shield, Users, Loader as Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  staff: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  member: 'bg-slate-700/50 text-slate-300 border border-slate-600/30',
  pending: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pending: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  async function load() {
    let query = supabase.from('church_users').select('*').order('created_at', { ascending: false });
    const { data } = await query;
    setUsers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateUser(id: string, updates: Partial<UserProfile>) {
    setUpdating(id);
    const { error } = await supabase.from('church_users').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User updated successfully' });
      load();
    }
    setUpdating(null);
  }

  async function approveUser(id: string) {
    await updateUser(id, { role: 'member', status: 'active' });
  }

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage member accounts, roles, and approval status.</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-sm px-3 py-1">
            {pendingCount} awaiting approval
          </Badge>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-36 bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900">
                  <th className="text-left px-5 py-3 font-semibold text-slate-400">Member</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Joined</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-500"><Users className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No users found</p></td></tr>
                ) : filtered.map((user) => {
                  const initials = user.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                  return (
                    <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-teal-500/10 text-teal-400 text-xs font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{user.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Select value={user.role} onValueChange={(v) => updateUser(user.id, { role: v as UserRole })} disabled={updating === user.id}>
                          <SelectTrigger className="h-8 w-28 text-xs bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {['admin', 'staff', 'member', 'pending'].map((r) => <SelectItem key={r} value={r} className="text-xs capitalize text-white">{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3.5">
                        <Select value={user.status} onValueChange={(v) => updateUser(user.id, { status: v as UserStatus })} disabled={updating === user.id}>
                          <SelectTrigger className="h-8 w-28 text-xs bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {['active', 'pending', 'suspended'].map((s) => <SelectItem key={s} value={s} className="text-xs capitalize text-white">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-slate-500 text-xs">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {user.status === 'pending' && (
                            <Button size="sm" className="h-7 text-xs bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={() => approveUser(user.id)} disabled={updating === user.id}>
                              {updating === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                              Approve
                            </Button>
                          )}
                          {user.status === 'active' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => updateUser(user.id, { status: 'suspended' })} disabled={updating === user.id}>
                              <UserX className="h-3.5 w-3.5 mr-1" />
                              Suspend
                            </Button>
                          )}
                          {user.status === 'suspended' && (
                            <Button size="sm" className="h-7 text-xs bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={() => updateUser(user.id, { status: 'active' })} disabled={updating === user.id}>
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
