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
import { adminWrite } from '@/lib/admin-write';
import { Plus, Trash2, Pencil, Loader as Loader2, Megaphone } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';

const BLANK = { title: '', body: '', priority: 'normal', expires_at: '', is_published: true };

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-400 border border-red-500/20',
  high: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  normal: 'bg-slate-700/50 text-slate-300 border border-slate-600/30',
  low: 'bg-slate-800/60 text-slate-500 border border-slate-700/30',
};

export default function AdminAnnouncementsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; description: string; onConfirm: () => void }>({ open: false, description: '', onConfirm: () => {} });

  async function load() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(100);
    const all = data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const expired = all.filter((a) => a.expires_at && a.expires_at.slice(0, 10) < today);
    const active = all.filter((a) => !a.expires_at || a.expires_at.slice(0, 10) >= today);
    setItems(active);
    setLoading(false);
    if (expired.length > 0) {
      await Promise.all(expired.map((a) => adminWrite('announcements', 'delete', undefined, a.id)));
    }
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
    const base = { title: form.title, body: form.body, priority: form.priority as Announcement['priority'], expires_at: form.expires_at || null, is_published: form.is_published };
    const payload: Record<string, unknown> = editing
      ? base
      : { ...base, created_by: user?.id ?? null, published_at: form.is_published ? new Date().toISOString() : null };
    const { error } = editing
      ? await adminWrite('announcements', 'update', payload, editing.id)
      : await adminWrite('announcements', 'insert', payload);
    if (error) { toast({ title: 'Error', description: error.message || 'Unable to save announcement.', variant: 'destructive' }); }
    else {
      toast({ title: editing ? 'Announcement updated' : 'Announcement created' });
      setOpen(false);
      if (editing) {
        setItems((prev) => prev.map((item) => item.id === editing.id ? { ...item, ...base } as Announcement : item));
      } else {
        load();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setConfirmDlg({
      open: true,
      description: 'Delete this announcement? This action cannot be undone.',
      onConfirm: async () => {
        const { error } = await adminWrite('announcements', 'delete', undefined, id);
        if (error) {
          toast({ title: 'Delete failed', description: error.message || 'Unable to delete announcement.', variant: 'destructive' });
        } else {
          toast({ title: 'Announcement deleted' });
          load();
        }
        setConfirmDlg((c) => ({ ...c, open: false }));
      },
    });
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
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-slate-200">Title *</Label>
                  <span className={`text-xs ${form.title.length > 90 ? 'text-red-400' : 'text-slate-500'}`}>{100 - form.title.length} left</span>
                </div>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 100) })}
                  maxLength={100}
                  required
                  placeholder="Announcement title (max 100 characters)"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-200">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">{['low', 'normal', 'high', 'urgent'].map((p) => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-200">Expires On</Label>
                  <Input
                    type="date"
                    value={form.expires_at}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 [color-scheme:dark]"
                  />
                </div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-full" />
                <col className="w-28 shrink-0" />
                <col className="w-24 shrink-0" />
                <col className="w-28 shrink-0 hidden md:table-column" />
                <col className="w-24 shrink-0" />
              </colgroup>
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
                    <td className="px-5 py-3 min-w-0">
                      <p className="font-medium text-white truncate break-all">{a.title}</p>
                      <p className="text-xs text-slate-500 truncate break-all mt-0.5">{a.body}</p>
                    </td>
                    <td className="px-4 py-3 shrink-0"><Badge className={`text-xs capitalize ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</Badge></td>
                    <td className="px-4 py-3 shrink-0"><Badge className={a.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs' : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 text-xs'}>{a.is_published ? 'Live' : 'Hidden'}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell whitespace-nowrap">{a.published_at ? format(new Date(a.published_at), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-5 py-3 shrink-0">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        {profile?.role === 'admin' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
