'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Group, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Loader as Loader2, Users } from 'lucide-react';

const CATEGORIES = ['general', 'bible_study', 'youth', 'women', 'men', 'couples', 'seniors', 'outreach'];
const BLANK = { name: '', description: '', meeting_time: '', location: '', category: 'general', max_members: '', is_open: true, is_published: true, leader_id: '' };

export default function AdminGroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });

  async function load() {
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from('groups').select('*, church_users(full_name)').order('created_at', { ascending: false }),
      supabase.from('church_users').select('id, full_name').eq('status', 'active').order('full_name'),
    ]);
    setGroups((g as any) ?? []);
    setMembers((m as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ ...BLANK }); setOpen(true); }
  function openEdit(g: Group) {
    setEditing(g);
    setForm({
      name: g.name, description: g.description ?? '', meeting_time: g.meeting_time ?? '',
      location: g.location ?? '', category: g.category, max_members: g.max_members?.toString() ?? '',
      is_open: g.is_open, is_published: g.is_published, leader_id: g.leader_id ?? '',
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      max_members: form.max_members ? parseInt(form.max_members) : null,
      leader_id: form.leader_id || null,
      image_url: '',
    };
    const { error } = editing
      ? await supabase.from('groups').update(payload).eq('id', editing.id)
      : await supabase.from('groups').insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
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

  return (
    <div className="p-6 lg:p-8">
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
                      <SelectItem value="">No leader</SelectItem>
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
                  <Input type="number" value={form.max_members} onChange={(e) => setForm({ ...form, max_members: e.target.value })} placeholder="Unlimited" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Room 201 / Online" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_open} onCheckedChange={(v) => setForm({ ...form, is_open: v })} />
                  <Label className="text-slate-300">Open to Join</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                  <Label className="text-slate-300">Published</Label>
                </div>
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
                    {(g as any).church_users?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5">
                      {g.is_published ? <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">Published</Badge> : <Badge className="bg-slate-700/50 text-slate-400 text-xs">Draft</Badge>}
                      {g.is_open && <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs">Open</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => openEdit(g)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => handleDelete(g.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                      </Button>
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
