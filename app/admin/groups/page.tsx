'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Loader as Loader2, Users, UserPlus, X, ShieldOff, ShieldCheck, Crown } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { adminWrite } from '@/lib/admin-write';

const CATEGORIES = ['general', 'bible_study', 'youth', 'women', 'men', 'couples', 'seniors', 'outreach'];
const BLANK = { name: '', description: '', meeting_time: '', location: '', category: 'general', max_members: '', is_published: true };

export default function AdminGroupsPage() {
  const { profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });

  // Member management state
  const [membersGroup, setMembersGroup] = useState<any | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; description: string; onConfirm: () => void }>({ open: false, description: '', onConfirm: () => {} });

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const [groupsResp, { data: m }] = await Promise.all([
        fetch('/api/admin/groups', { headers: { Authorization: `Bearer ${token}` } }),
        supabase.from('church_users').select('id, full_name, email, avatar_url').eq('status', 'active').order('full_name'),
      ]);

      const groupsJson = await groupsResp.json();
      if (!groupsResp.ok) {
        toast({ title: 'Failed to load groups', description: groupsJson.error ?? `HTTP ${groupsResp.status}`, variant: 'destructive' });
        setGroups([]);
      } else {
        setGroups(groupsJson.groups ?? []);
      }
      setMembers((m as any) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      toast({ title: 'Failed to load groups', description: msg, variant: 'destructive' });
      setGroups([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ ...BLANK }); setOpen(true); }
  function openEdit(g: any) {
    setEditing(g);
    setForm({
      name: g.name, description: g.description ?? '', meeting_time: g.meeting_time ?? '',
      location: g.location ?? '', category: g.category ?? 'general', max_members: g.max_members?.toString() ?? '',
      is_published: g.is_published ?? true,
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const trimmedName = form.name.trim();
      if (!trimmedName) {
        toast({ title: 'Group name is required', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const duplicate = groups.some(
        (g) => g.name.toLowerCase() === trimmedName.toLowerCase() && (!editing || editing.id !== g.id)
      );
      if (duplicate) {
        toast({ title: 'Duplicate name', description: 'A group with this name already exists.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Always refresh session to ensure token is not stale
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: 'Session expired', description: 'Please refresh the page and log in again.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const token = session.access_token;

      const body: Record<string, unknown> = {
        name: trimmedName,
        description: form.description || '',
        category: form.category || 'general',
        meeting_time: form.meeting_time || '',
        location: form.location || '',
        max_members: form.max_members ? parseInt(form.max_members, 10) : null,
        is_published: form.is_published,
      };
      if (editing) body.id = editing.id;

      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      let json: Record<string, unknown> = {};
      try { json = await res.json(); } catch { /* non-JSON response */ }

      if (!res.ok) {
        const msg = (json.error as string) || `HTTP ${res.status}`;
        toast({ title: 'Error saving group', description: msg, variant: 'destructive' });
      } else {
        toast({ title: editing ? 'Group updated' : 'Group created!' });
        setOpen(false);
        load();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setConfirmDlg({
      open: true,
      description: 'Delete this group? All members will be removed. This action cannot be undone.',
      onConfirm: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? '';
        const res = await fetch(`/api/admin/groups?id=${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) { toast({ title: 'Delete failed', description: json.error, variant: 'destructive' }); }
        else { toast({ title: 'Group deleted' }); load(); }
        setConfirmDlg((c) => ({ ...c, open: false }));
      },
    });
  }

  async function openGroupMembers(g: any) {
    setMembersGroup(g);
    setMembersLoading(true);
    setSelectedMemberId('');
    const { data: gmData } = await supabase.from('group_members').select('*').eq('group_id', g.id).order('joined_at');
    const userIds = (gmData ?? []).map((gm: any) => gm.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('church_users').select('id, full_name, email, avatar_url, status').in('id', userIds)
      : { data: [] as any[] };
    const merged = (gmData ?? []).map((gm: any) => ({
      ...gm,
      church_users: (profiles ?? []).find((u: any) => u.id === gm.user_id) ?? null,
    }));
    setGroupMembers(merged);
    setMembersLoading(false);
  }

  async function handleChangeRole(gmId: string, newRole: 'member' | 'leader') {
    const { error } = await adminWrite('group_members', 'update', { role: newRole }, gmId);
    if (error) { toast({ title: 'Error', description: 'Unable to change role.', variant: 'destructive' }); return; }
    toast({ title: newRole === 'leader' ? 'Promoted to leader' : 'Changed to member' });
    if (membersGroup) await openGroupMembers(membersGroup);
  }

  async function handleSuspendUser(userId: string, name: string, currentStatus: string) {
    const isSuspended = currentStatus === 'suspended';
    const action = isSuspended ? 'Reactivate' : 'Suspend';
    setConfirmDlg({
      open: true,
      description: `${action} ${name}'s account?${!isSuspended ? ' They will lose access to the app.' : ''}`,
      onConfirm: async () => {
        const newStatus = isSuspended ? 'active' : 'suspended';
        const { error } = await adminWrite('church_users', 'update', { status: newStatus }, userId);
        if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
        else {
          toast({ title: isSuspended ? 'Account reactivated' : 'Account suspended' });
          if (membersGroup) await openGroupMembers(membersGroup);
        }
        setConfirmDlg((c) => ({ ...c, open: false }));
      },
    });
  }

  async function handleAddGroupMember() {
    if (!selectedMemberId || !membersGroup) return;
    const already = groupMembers.some((m: any) => m.user_id === selectedMemberId);
    if (already) {
      toast({ title: 'Already a member', description: 'This person is already in the group.', variant: 'destructive' });
      return;
    }
    if (membersGroup.max_members && groupMembers.length >= membersGroup.max_members) {
      toast({ title: 'Group is full', description: 'This group has reached its maximum capacity. Increase the limit first.', variant: 'destructive' });
      return;
    }
    setAddingMember(true);
    const { error } = await adminWrite('group_members', 'insert', {
      group_id: membersGroup.id,
      user_id: selectedMemberId,
      role: 'member',
      joined_at: new Date().toISOString(),
    });
    if (error) { toast({ title: 'Error', description: 'Unable to add member. Please try again.', variant: 'destructive' }); }
    else { toast({ title: 'Member added!' }); setSelectedMemberId(''); await openGroupMembers(membersGroup); }
    setAddingMember(false);
  }

  async function handleRemoveGroupMember(memberId: string) {
    const { error } = await adminWrite('group_members', 'delete', undefined, memberId);
    if (error) { toast({ title: 'Error', description: 'Unable to remove member. Please try again.', variant: 'destructive' }); return; }
    toast({ title: 'Member removed' });
    if (membersGroup) await openGroupMembers(membersGroup);
  }

  const availableToAdd = members.filter((m) => !groupMembers.some((gm: any) => gm.user_id === m.id));

  return (
    <div className="p-6 lg:p-8">
      {/* Member Management Dialog */}
      <Dialog open={!!membersGroup} onOpenChange={(o) => { if (!o) setMembersGroup(null); }}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700/50 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Members — {membersGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            {/* Add member */}
            <div className="flex gap-2">
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="flex-1 bg-slate-800 border-slate-700 text-white text-sm">
                  <SelectValue placeholder="Select member to add…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {availableToAdd.length === 0 ? (
                    <SelectItem value="_none" disabled className="text-slate-500">All members already added</SelectItem>
                  ) : availableToAdd.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-white">{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddGroupMember}
                disabled={!selectedMemberId || addingMember}
                className="bg-teal-500 hover:bg-teal-400 text-white shrink-0"
              >
                {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>

            {/* Members list */}
            {membersLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-teal-400" /></div>
            ) : groupMembers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No members yet. Add someone above.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}</p>
                {groupMembers.map((gm: any) => {
                  const u = gm.church_users;
                  const initials = u?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                  const isSuspended = u?.status === 'suspended';
                  const isLeader = gm.role === 'leader';
                  return (
                    <div key={gm.id} className="bg-slate-800 rounded-lg px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={u?.avatar_url} />
                            <AvatarFallback className="bg-teal-500/10 text-teal-400 text-xs font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-white">{u?.full_name ?? 'Unknown'}</p>
                              {isLeader && (
                                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-1.5 py-0">Leader</Badge>
                              )}
                              {isSuspended && (
                                <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs px-1.5 py-0">Suspended</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{u?.email}</p>
                          </div>
                        </div>
                        {(currentProfile?.role === 'admin' || currentProfile?.role === 'staff') && (
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <button
                              onClick={() => handleChangeRole(gm.id, isLeader ? 'member' : 'leader')}
                              className={`p-1 rounded transition-colors ${isLeader ? 'text-amber-400 hover:text-slate-400' : 'text-slate-500 hover:text-amber-400'}`}
                              title={isLeader ? 'Demote to member' : 'Promote to leader'}
                            >
                              <Crown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSuspendUser(gm.user_id, u?.full_name ?? 'this user', u?.status ?? 'active')}
                              className={`p-1 rounded transition-colors ${isSuspended ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-yellow-400'}`}
                              title={isSuspended ? 'Reactivate account' : 'Suspend account'}
                            >
                              {isSuspended ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => handleRemoveGroupMember(gm.id)}
                              className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                              title="Remove from group"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups Management</h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage small groups and ministries.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700/50 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">{editing ? 'Edit Group' : 'Create New Group'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-2">
              <div>
                <Label className="text-slate-300">Group Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tuesday Bible Study" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
              </div>
              <div>
                <Label className="text-slate-300">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What is this group about?" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
              </div>
              <div>
                <Label className="text-slate-300">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Meeting Time</Label>
                  <Input value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} placeholder="e.g. Tuesdays 7PM" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Max Members</Label>
                  <Input type="number" min="1" max="500" value={form.max_members} onChange={(e) => setForm({ ...form, max_members: e.target.value })} placeholder="Unlimited" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Room 201 / Online" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label className="text-slate-300">Published</Label>
              </div>
              <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? 'Update Group' : 'Create Group'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No groups yet. Create your first group.</p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3 font-semibold text-slate-400">Group</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Leader</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-400 sticky right-0 bg-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3.5 max-w-[220px]">
                    <p className="font-medium text-white truncate" title={g.name}>{g.name}</p>
                    {g.meeting_time && <p className="text-xs text-slate-500 truncate">{g.meeting_time}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge className="bg-slate-700/50 text-slate-300 border border-slate-600/30 capitalize text-xs">
                      {(g.category ?? 'general').replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-slate-400 text-xs">
                    {(() => {
                      const leaderGm = (g.group_members ?? []).find((gm: any) => gm.role === 'leader');
                      return leaderGm ? (members.find((m) => m.id === leaderGm.user_id)?.full_name ?? '—') : '—';
                    })()}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {g.is_published ? <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">Published</Badge> : <Badge className="bg-slate-700/50 text-slate-400 text-xs">Draft</Badge>}
                      <Badge className="bg-slate-700/50 text-slate-400 border border-slate-600/30 text-xs">
                        <Users className="h-2.5 w-2.5 mr-1" />{(g.group_members ?? []).length}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 sticky right-0 bg-slate-900">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20" onClick={() => openGroupMembers(g)}>
                        <Users className="h-3.5 w-3.5 mr-1" />Members
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => openEdit(g)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                      {currentProfile?.role === 'admin' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => handleDelete(g.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
