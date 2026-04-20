'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Sermon, SermonSeries } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Loader as Loader2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

const BLANK = { title: '', description: '', pastor: '', series_id: '', video_url: '', audio_url: '', thumbnail_url: '', scripture_reference: '', duration_minutes: 0, is_published: false };

export default function AdminSermonsPage() {
  const { toast } = useToast();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [series, setSeries] = useState<SermonSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Sermon | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });

  async function load() {
    const [{ data: s }, { data: sr }] = await Promise.all([
      supabase.from('sermons').select('*, sermon_series(*)').order('created_at', { ascending: false }),
      supabase.from('sermon_series').select('*'),
    ]);
    setSermons(s ?? []);
    setSeries(sr ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ ...BLANK });
    setOpen(true);
  }

  function openEdit(s: Sermon) {
    setEditing(s);
    setForm({ title: s.title, description: s.description, pastor: s.pastor, series_id: s.series_id ?? '', video_url: s.video_url, audio_url: s.audio_url, thumbnail_url: s.thumbnail_url, scripture_reference: s.scripture_reference, duration_minutes: s.duration_minutes, is_published: s.is_published });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, series_id: form.series_id || null, published_at: form.is_published ? new Date().toISOString() : null };
    const { error } = editing ? await supabase.from('sermons').update(payload).eq('id', editing.id) : await supabase.from('sermons').insert(payload);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Sermon updated' : 'Sermon created' });
      setOpen(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sermon?')) return;
    await supabase.from('sermons').delete().eq('id', id);
    toast({ title: 'Sermon deleted' });
    load();
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sermons</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your sermon library and series.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />New Sermon
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/50">
            <DialogHeader><DialogTitle className="text-white">{editing ? 'Edit Sermon' : 'Add New Sermon'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div><Label className="text-slate-200">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-200">Pastor *</Label><Input value={form.pastor} onChange={(e) => setForm({ ...form, pastor: e.target.value })} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
                <div><Label className="text-slate-200">Series</Label>
                  <Select value={form.series_id} onValueChange={(v) => setForm({ ...form, series_id: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="" className="text-white">None</SelectItem>{series.map((s) => <SelectItem key={s.id} value={s.id} className="text-white">{s.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-slate-200">Scripture Reference</Label><Input value={form.scripture_reference} onChange={(e) => setForm({ ...form, scripture_reference: e.target.value })} placeholder="e.g. John 3:16" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div><Label className="text-slate-200">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div><Label className="text-slate-200">Video URL</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="YouTube or Vimeo URL" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div><Label className="text-slate-200">Audio URL</Label><Input value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div><Label className="text-slate-200">Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div><Label className="text-slate-200">Duration (minutes)</Label><Input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_published} onCheckedChange={(c) => setForm({ ...form, is_published: c })} className="data-[state=unchecked]:bg-slate-700" />
                <Label className="font-normal text-slate-200">Publish immediately</Label>
              </div>
              <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? 'Update Sermon' : 'Create Sermon'}
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
                <th className="text-left px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Pastor</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 hidden lg:table-cell">Series</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sermons.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-500"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No sermons yet</p></td></tr>
              ) : sermons.map((s) => (
                <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-white line-clamp-1">{s.title}</p>
                    {s.scripture_reference && <p className="text-xs text-slate-500">{s.scripture_reference}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{s.pastor}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{(s.sermon_series as any)?.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={s.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs' : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 text-xs'}>
                      {s.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
