'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { UserProfile, UserRole, UserStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { adminWrite } from '@/lib/admin-write';
import { Search, UserCheck, UserX, Users, Loader as Loader2, UserPlus, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function AdminUsersPage() {
  const router = useRouter();
  const { profile: currentProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && currentProfile && currentProfile.role !== 'admin') {
      router.replace('/admin');
    }
  }, [currentProfile, authLoading]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '', role: 'member', status: 'active' });
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; description: string; onConfirm: () => void }>({ open: false, description: '', onConfirm: () => {} });

  async function load() {
    const { data } = await supabase.from('church_users').select('*').order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateUser(id: string, updates: Partial<UserProfile>) {
    setUpdating(id);
    const { error } = await adminWrite('church_users', 'update', { ...updates, updated_at: new Date().toISOString() }, id);
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

  async function rejectUser(id: string) {
    setConfirmDlg({
      open: true,
      description: 'Reject this registration? The account will be suspended.',
      onConfirm: async () => {
        await updateUser(id, { status: 'suspended' });
        setConfirmDlg((c) => ({ ...c, open: false }));
      },
    });
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.full_name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      toast({ title: 'Validation error', description: 'Name, email, and password are required.', variant: 'destructive' });
      return;
    }
    setAdding(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: 'Failed to add member', description: data.error, variant: 'destructive' });
    } else {
      toast({ title: 'Member added successfully!' });
      setAddForm({ full_name: '', email: '', password: '', role: 'member', status: 'active' });
      setAddOpen(false);
      load();
    }
    setAdding(false);
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
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-sm px-3 py-1">
              {pendingCount} awaiting approval
            </Badge>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700/50">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4 mt-2">
                <div>
                  <Label className="text-slate-300">Full Name *</Label>
                  <Input value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} placeholder="Jane Doe" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Email Address *</Label>
                  <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="jane@example.com" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Password *</Label>
                  <Input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Min. 6 characters" required minLength={6} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Role</Label>
                    <Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['admin', 'staff', 'member'].map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Status</Label>
                    <Select value={addForm.status} onValueChange={(v) => setAddForm({ ...addForm, status: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['active', 'pending', 'suspended'].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={adding}>
                  {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {adding ? 'Creating...' : 'Create Member'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
                ) : filtered.map((u) => {
                  const initials = u.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                  return (
                    <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback className="bg-teal-500/10 text-teal-400 text-xs font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{u.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Select value={u.role} onValueChange={(v) => updateUser(u.id, { role: v as UserRole })} disabled={updating === u.id}>
                          <SelectTrigger className="h-8 w-28 text-xs bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {['admin', 'staff', 'member', 'pending'].map((r) => <SelectItem key={r} value={r} className="text-xs capitalize text-white">{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3.5">
                        <Select value={u.status} onValueChange={(v) => updateUser(u.id, { status: v as UserStatus })} disabled={updating === u.id}>
                          <SelectTrigger className="h-8 w-28 text-xs bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {['active', 'pending', 'suspended'].map((s) => <SelectItem key={s} value={s} className="text-xs capitalize text-white">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-slate-500 text-xs">
                        {u.created_at
                          ? format(new Date(u.created_at.slice(0, 10) + 'T12:00:00'), 'MMM d, yyyy')
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {u.status === 'pending' && (
                            <>
                              <Button size="sm" className="h-7 text-xs bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={() => approveUser(u.id)} disabled={updating === u.id}>
                                {updating === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => rejectUser(u.id)} disabled={updating === u.id}>
                                <Ban className="h-3.5 w-3.5 mr-1" />Reject
                              </Button>
                            </>
                          )}
                          {u.status === 'active' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => updateUser(u.id, { status: 'suspended' })} disabled={updating === u.id}>
                              <UserX className="h-3.5 w-3.5 mr-1" />
                              Suspend
                            </Button>
                          )}
                          {u.status === 'suspended' && (
                            <Button size="sm" className="h-7 text-xs bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={() => updateUser(u.id, { status: 'active' })} disabled={updating === u.id}>
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

      <ConfirmDialog
        open={confirmDlg.open}
        description={confirmDlg.description}
        onConfirm={confirmDlg.onConfirm}
        onCancel={() => setConfirmDlg((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
