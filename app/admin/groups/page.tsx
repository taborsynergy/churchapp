'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Group, UserProfile } from '@/lib/types';
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
import { Plus, Trash2, Pencil, Loader as Loader2, Users, UserPlus, X } from 'lucide-react';

const CATEGORIES = ['general', 'bible_study', 'youth', 'women', 'men', 'couples', 'seniors', 'outreach'];
// is_published maps to DB column "published"; leader_id is UI-only (stored as leader_name text in DB)
const BLANK = { name: '', description: '', meeting_time: '', location: '', category: 'general', max_members: '', is_published: true, leader_id: 'none' };

export default function AdminGroupsPage() {
  const { profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });

  // Member management state
  const [membersGroup, setMembersGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  async function load() {
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('church_users').select('id, full_name, email, avatar_url').eq('status', 'active').order('full_name'),
    ]);
    setGroups((g as any) ?? []);
    setMembers((m as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ ...BLANK }); setOpen(true); }
  function openEdit(g: any) {
    setEditing(g);
    setForm({
      name: g.name, description: g.description ?? '', meeting_time: g.meeting_time ?? '',
      location: g.location ?? '', category: g.category ?? 'general', max_members: g.max_members?.toString() ?? '',
      is_published: g.published ?? true, leader_id: 'none',
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const leaderMember = form.leader_id !== 'none' ? members.find((m) => m.id === form.leader_id) : null;
    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      meeting_time: form.meeting_time,
      location: form.location,
      max_members: form.max_members ? parseInt(form.max_members) : null,
      published: form.is_published,
      leader_name: leaderMember?.full_name ?? null,
    };
    const { error } = editing
      ? await supabase.from('groups').update(payload).eq('id', (editing as any).id)
      : await supabase.from('groups').insert(payload);
    if (error) { toast({ title: 'Error', description: 'Unable to save group. Please try again.', variant: 'destructive' }); }
    else { toast({ title: editing ? 'Group updated' : 'Group created' }); setOpen(false); load(); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this group? All members will be removed.')) return;
    await supabase.from('group_members').delete().eq('group_id', id);
    await supabase.from('groups').delete().eq('id', id);
    toast({ title: 'Group deleted' });
    load();
  }

  async function openGroupMembers(g: Group) {
    setMembersGroup(g);
    setMembersLoading(true);
    setSelectedMemberId('');
    const { data } = await supabase
      .from('group_members')
      .select('*, church_users(id, full_name, email, avatar_url)')
      .eq('group_id', g.id)
      .order('joined_at');
    setGroupMembers(data ?? []);
    setMembersLoading(false);
  }

  async function handleAddGroupMember() {
    if (!selectedMemberId || !membersGroup) return;
    const already = groupMembers.some((m: any) => m.user_id === selectedMemberId);
    if (already) {
      toast({ title: 'Already a member', description: 'This person is already in the group.', variant: 'destructive' });
      return;
    }
    setAddingMember(true);
    const { error } = await supabase.from('group_members').insert({
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
    const { error } = await supabase.from('group_members').delete().eq('id', memberId);
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
                  return (
                    <div key={gm.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={u?.avatar_url} />
                          <AvatarFallback className="bg-teal-500/10 text-teal-400 text-xs font-semibold">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white">{u?.full_name ?? 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{u?.email}</p>
                        </div>
                      </div>
                      {currentProfile?.role === 'admin' && (
                        <button onClick={() => handleRemoveGroupMember(gm.id)} className="text-red-400 hover:text-red-300 ml-2">
                          <X className="h-4 w-4" />
                        </button>
                      )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Leader</Label>
                  <Select value={form.leader_id} onValueChange={(v) => setForm({ ...form, leader_id: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1"><SelectValue placeholder="Select leader" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No leader</SelectItem>
                      {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3 font-semibold text-slate-400">Group</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Leader</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white">{g.name}</p>
                    {g.meeting_time && <p className="text-xs text-slate-500">{g.meeting_time}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge className="bg-slate-700/50 text-slate-300 border border-slate-600/30 capitalize text-xs">
                      {g.category.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-slate-400 text-xs">
                    {(g as any).leader_name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5">
                      {(g as any).published ? <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">Published</Badge> : <Badge className="bg-slate-700/50 text-slate-400 text-xs">Draft</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
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
      )}
    </div>
  );
}
