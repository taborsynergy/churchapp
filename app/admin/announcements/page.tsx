'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { Plus, Trash2, Pencil, Loader as Loader2, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

const BLANK = { title: '', body: '', priority: 'normal', expires_at: '', is_published: true };

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-400 border border-red-500/20',
  high: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  normal: 'bg-slate-700/50 text-slate-300 border border-slate-600/30',
  low: 'bg-slate-800/60 text-slate-500 border border-slate-700/30',
};

export default function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });

  async function load() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ ...BLANK }); setOpen(true); }
  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({ title: a.title, body: a.body, priority: a.priority, expires_at: a.expires_at ? a.expires_at.slice(0, 10) : '', is_published: a.is_published });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, expires_at: form.expires_at || null, created_by: user?.id ?? null, published_at: new Date().toISOString() };
    const { error } = editing ? await supabase.from('announcements').update(payload).eq('id', editing.id) : await supabase.from('announcements').insert(payload);
    if (error) { toast({ title: 'Error', description: 'Unable to save announcement. Please try again.', variant: 'destructive' }); }
    else { toast({ title: editing ? 'Announcement updated' : 'Announcement created' }); setOpen(false); load(); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    toast({ title: 'Announcement deleted' });
    load();
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-slate-400 text-sm mt-1">Post updates and news for your congregation.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-slate-900 border border-slate-700/50">
            <DialogHeader><DialogTitle className="text-white">{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div><Label className="text-slate-200">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-200">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">{['low', 'normal', 'high', 'urgent'].map((p) => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-slate-200">Expires On</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              </div>
              <div><Label className="text-slate-200">Message *</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="flex items-center gap-3"><Switch checked={form.is_published} onCheckedChange={(c) => setForm({ ...form, is_published: c })} className="data-[state=unchecked]:bg-slate-700" /><Label className="font-normal text-slate-200">Publish immediately</Label></div>
              <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Publish Announcement'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div> : (
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900">
                <th className="text-left px-5 py-3 font-semibold text-slate-400">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Priority</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Published</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-500"><Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No announcements yet</p></td></tr>
              ) : items.map((a) => (
                <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-white line-clamp-1">{a.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{a.body}</p>
                  </td>
                  <td className="px-4 py-3"><Badge className={`text-xs capitalize ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</Badge></td>
                  <td className="px-4 py-3"><Badge className={a.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs' : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 text-xs'}>{a.is_published ? 'Live' : 'Hidden'}</Badge></td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{format(new Date(a.published_at), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
