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
import { Plus, Trash2, Pencil, Loader as Loader2, BookOpen, ListVideo, Upload, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/components/providers/AuthProvider';
import { LockedModule } from '@/components/ui/locked-module';
import { adminWrite } from '@/lib/admin-write';

const BLANK = { title: '', description: '', pastor: '', series_id: 'none', video_url: '', audio_url: '', thumbnail_url: '', scripture_reference: '', duration_minutes: 0, is_published: false };
const SERIES_BLANK = { title: '', description: '', image_url: '', is_active: true };

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AdminSermonsPage() {
  const { profile, canAccess } = useAuth();
  const { toast } = useToast();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [series, setSeries] = useState<SermonSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Sermon | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesSaving, setSeriesSaving] = useState(false);
  const [seriesForm, setSeriesForm] = useState<typeof SERIES_BLANK>({ ...SERIES_BLANK });
  const [seriesUrlError, setSeriesUrlError] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; description: string; onConfirm: () => void }>({ open: false, description: '', onConfirm: () => {} });

  function validateUrl(field: string, value: string, setter: (e: Record<string, string>) => void, current: Record<string, string>) {
    if (!value.trim()) {
      const next = { ...current };
      delete next[field];
      setter(next);
      return;
    }
    if (!isValidUrl(value)) {
      setter({ ...current, [field]: 'Enter a valid URL starting with https://' });
    } else {
      const next = { ...current };
      delete next[field];
      setter(next);
    }
  }

  async function load() {
    const [{ data: s }, { data: sr }] = await Promise.all([
      supabase.from('sermons').select('*, sermon_series(*)').order('created_at', { ascending: false }).limit(100),
      supabase.from('sermon_series').select('*').order('created_at', { ascending: false }),
    ]);
    setSermons(s ?? []);
    setSeries(sr ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ ...BLANK }); setUrlErrors({}); setOpen(true); }
  function openEdit(s: Sermon) {
    setEditing(s);
    setForm({ title: s.title, description: s.description, pastor: s.pastor, series_id: s.series_id ?? 'none', video_url: s.video_url, audio_url: s.audio_url, thumbnail_url: s.thumbnail_url, scripture_reference: s.scripture_reference, duration_minutes: s.duration_minutes, is_published: s.is_published });
    setUrlErrors({});
    setOpen(true);
  }

  async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumb(true);
    const { data: { session } } = await supabase.auth.getSession();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'sermons');
    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: fd,
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: 'Upload failed', description: json.error ?? 'Unable to upload image.', variant: 'destructive' });
    } else {
      setForm((prev) => ({ ...prev, thumbnail_url: json.url }));
      const next = { ...urlErrors };
      delete next['thumbnail_url'];
      setUrlErrors(next);
    }
    setUploadingThumb(false);
    e.target.value = '';
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const urlFields: Array<keyof typeof BLANK> = ['video_url', 'audio_url', 'thumbnail_url'];
    const invalidField = urlFields.find((f) => !isValidUrl(form[f] as string));
    if (invalidField) {
      toast({ title: 'Invalid URL', description: `Please enter a valid URL for ${invalidField.replace(/_/g, ' ')}.`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = { ...form, series_id: form.series_id && form.series_id !== 'none' ? form.series_id : null, published_at: form.is_published ? new Date().toISOString() : null };
    const { error } = editing ? await adminWrite('sermons', 'update', payload, editing.id) : await adminWrite('sermons', 'insert', payload);
    if (error) { toast({ title: 'Error', description: 'Unable to save sermon. Please try again.', variant: 'destructive' }); }
    else { toast({ title: editing ? 'Sermon updated' : 'Sermon created' }); setOpen(false); load(); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setConfirmDlg({
      open: true,
      description: 'Delete this sermon? This action cannot be undone.',
      onConfirm: async () => {
        const { error } = await adminWrite('sermons', 'delete', undefined, id);
        if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); }
        else { toast({ title: 'Sermon deleted' }); load(); }
        setConfirmDlg((c) => ({ ...c, open: false }));
      },
    });
  }

  async function handleSeriesSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUrl(seriesForm.image_url)) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid URL for image URL.', variant: 'destructive' });
      return;
    }
    setSeriesSaving(true);
    const { error } = await adminWrite('sermon_series', 'insert', seriesForm as Record<string, unknown>);
    if (error) { toast({ title: 'Error', description: 'Unable to create series. Please try again.', variant: 'destructive' }); }
    else { toast({ title: 'Series created!' }); setSeriesForm({ ...SERIES_BLANK }); setSeriesUrlError(''); setSeriesOpen(false); load(); }
    setSeriesSaving(false);
  }

  async function handleSeriesDelete(id: string) {
    setConfirmDlg({
      open: true,
      description: 'Delete this series? Sermons in this series will not be deleted.',
      onConfirm: async () => {
        const { error } = await adminWrite('sermon_series', 'delete', undefined, id);
        if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); }
        else { toast({ title: 'Series deleted' }); load(); }
        setConfirmDlg((c) => ({ ...c, open: false }));
      },
    });
  }

  if (!canAccess('sermons')) return <LockedModule moduleName="Sermons" requiredPlan="parish" />;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Sermons</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your sermon library and series.</p>
        </div>
        <div className="flex gap-2">
          {/* New Series Dialog */}
          <Dialog open={seriesOpen} onOpenChange={setSeriesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 bg-transparent">
                <ListVideo className="h-4 w-4 mr-2" />New Series
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700/50">
              <DialogHeader><DialogTitle className="text-white">Create Sermon Series</DialogTitle></DialogHeader>
              <form onSubmit={handleSeriesSave} className="space-y-4 mt-2">
                <div>
                  <Label className="text-slate-300">Series Title *</Label>
                  <Input value={seriesForm.title} onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })} placeholder="e.g. Faith & Courage" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Description</Label>
                  <Textarea value={seriesForm.description} onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })} rows={3} placeholder="What is this series about?" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Image URL</Label>
                  <Input
                    value={seriesForm.image_url}
                    onChange={(e) => { setSeriesForm({ ...seriesForm, image_url: e.target.value }); if (seriesUrlError) setSeriesUrlError(''); }}
                    onBlur={(e) => { if (e.target.value && !isValidUrl(e.target.value)) setSeriesUrlError('Enter a valid URL starting with https://'); else setSeriesUrlError(''); }}
                    placeholder="https://..."
                    className={`bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1 ${seriesUrlError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {seriesUrlError && <p className="text-xs text-red-400 mt-1">{seriesUrlError}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={seriesForm.is_active} onCheckedChange={(v) => setSeriesForm({ ...seriesForm, is_active: v })} />
                  <Label className="text-slate-300 font-normal">Active Series</Label>
                </div>
                <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={seriesSaving}>
                  {seriesSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Series
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* New Sermon Dialog */}
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
                      <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="none" className="text-white">None</SelectItem>{series.map((s) => <SelectItem key={s.id} value={s.id} className="text-white">{s.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-slate-200">Scripture Reference</Label><Input value={form.scripture_reference} onChange={(e) => setForm({ ...form, scripture_reference: e.target.value })} placeholder="e.g. John 3:16" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
                <div><Label className="text-slate-200">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
                {(['video_url', 'audio_url'] as const).map((field) => (
                  <div key={field}>
                    <Label className="text-slate-200 capitalize">{field.replace(/_/g, ' ').replace('url', 'URL')}</Label>
                    <Input
                      value={form[field]}
                      placeholder="https://..."
                      onChange={(e) => {
                        setForm({ ...form, [field]: e.target.value });
                        if (urlErrors[field]) {
                          const next = { ...urlErrors };
                          delete next[field];
                          setUrlErrors(next);
                        }
                      }}
                      onBlur={(e) => validateUrl(field, e.target.value, setUrlErrors, urlErrors)}
                      className={`bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1 ${urlErrors[field] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {urlErrors[field] && <p className="text-xs text-red-400 mt-1">{urlErrors[field]}</p>}
                  </div>
                ))}
                <div>
                  <Label className="text-slate-200">Thumbnail Image</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {form.thumbnail_url && (
                      <img src={form.thumbnail_url} alt="Thumbnail" className="h-12 w-20 object-cover rounded border border-slate-700 shrink-0" />
                    )}
                    <label className="cursor-pointer flex-1">
                      <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} disabled={uploadingThumb} />
                      <div className={`flex items-center justify-center gap-2 h-10 px-3 rounded-md border border-slate-700 bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors ${uploadingThumb ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {uploadingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploadingThumb ? 'Uploading...' : form.thumbnail_url ? 'Change Image' : 'Upload Thumbnail'}
                      </div>
                    </label>
                    {form.thumbnail_url && (
                      <button type="button" onClick={() => setForm({ ...form, thumbnail_url: '' })} className="shrink-0 text-red-400 hover:text-red-300">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
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
      </div>

      {/* Series list */}
      {series.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Sermon Series</h2>
          <div className="flex flex-wrap gap-2">
            {series.map((sr) => (
              <div key={sr.id} className="flex items-center gap-2 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-sm text-white font-medium">{sr.title}</span>
                <Badge className={sr.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs' : 'bg-slate-700 text-slate-400 text-xs'}>
                  {sr.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {profile?.role === 'admin' && (
                  <button onClick={() => handleSeriesDelete(sr.id)} className="text-red-400 hover:text-red-300 ml-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                      {profile?.role === 'admin' && <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
