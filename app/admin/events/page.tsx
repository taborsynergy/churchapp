'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Loader as Loader2, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/components/providers/AuthProvider';

const BLANK = { title: '', description: '', location: '', start_date: '', end_date: '', image_url: '', capacity: '', category: 'general', is_published: true };

export default function AdminEventsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  async function load() {
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: false });
    setEvents(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ ...BLANK }); setOpen(true); }
  function openEdit(e: Event) {
    setEditing(e);
    setForm({ title: e.title, description: e.description, location: e.location, start_date: e.start_date ? e.start_date.slice(0, 16) : '', end_date: e.end_date ? e.end_date.slice(0, 16) : '', image_url: e.image_url, capacity: e.capacity?.toString() ?? '', category: e.category, is_published: e.is_published });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && form.start_date && new Date(form.start_date) < new Date()) {
      toast({ title: 'Invalid date', description: 'Event date cannot be in the past.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = { ...form, capacity: form.capacity ? parseInt(form.capacity) : null, end_date: form.end_date || null, created_by: user?.id ?? null };
    const { error } = editing ? await supabase.from('events').update(payload).eq('id', editing.id) : await supabase.from('events').insert(payload);
    if (error) { toast({ title: 'Error', description: 'Unable to save event. Please try again.', variant: 'destructive' }); }
    else { toast({ title: editing ? 'Event updated' : 'Event created' }); setOpen(false); load(); }
    setSaving(false);
  }

  async function openRsvps(ev: Event) {
    setRsvpEvent(ev);
    setRsvpLoading(true);
    const { data } = await supabase.from('event_rsvps').select('*, church_users(full_name, email)').eq('event_id', ev.id).order('created_at');
    setRsvps(data ?? []);
    setRsvpLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) return;
    await supabase.from('events').delete().eq('id', id);
    toast({ title: 'Event deleted' });
    load();
  }

  return (
    <div className="p-6 lg:p-8">
      {/* RSVP Dialog */}
      <Dialog open={!!rsvpEvent} onOpenChange={(o) => { if (!o) setRsvpEvent(null); }}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700/50 max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">RSVPs — {rsvpEvent?.title}</DialogTitle></DialogHeader>
          {rsvpLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /></div>
          ) : rsvps.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No RSVPs yet for this event.</p>
          ) : (
            <div className="space-y-2 mt-2">
              <p className="text-xs text-slate-500 mb-3">{rsvps.length} attendee{rsvps.length !== 1 ? 's' : ''}</p>
              {rsvps.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{(r.church_users as any)?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{(r.church_users as any)?.email}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs capitalize">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-slate-400 text-sm mt-1">Manage church events and activities.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Event</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/50">
            <DialogHeader><DialogTitle className="text-white">{editing ? 'Edit Event' : 'Add New Event'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div><Label className="text-slate-200">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-200">Start Date & Time *</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
                <div><Label className="text-slate-200">End Date & Time</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              </div>
              <div><Label className="text-slate-200">Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-200">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">{['general', 'worship', 'youth', 'outreach', 'fellowship', 'prayer'].map((c) => <SelectItem key={c} value={c} className="text-white capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-slate-200">Capacity</Label><Input type="number" min="1" max="10000" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Unlimited" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              </div>
              <div><Label className="text-slate-200">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div><Label className="text-slate-200">Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="flex items-center gap-3"><Switch checked={form.is_published} onCheckedChange={(c) => setForm({ ...form, is_published: c })} className="data-[state=unchecked]:bg-slate-700" /><Label className="font-normal text-slate-200">Publish immediately</Label></div>
              <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update Event' : 'Create Event'}
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
                <th className="text-left px-5 py-3 font-semibold text-slate-400">Event</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-500"><Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No events yet</p></td></tr>
              ) : events.map((e) => (
                <tr key={e.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-white line-clamp-1">{e.title}</p>
                    {e.location && <p className="text-xs text-slate-500">{e.location}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs hidden md:table-cell">{format(new Date(e.start_date), 'MMM d, yyyy h:mm a')}</td>
                  <td className="px-4 py-3">
                    <Badge className={e.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs' : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 text-xs'}>{e.is_published ? 'Published' : 'Draft'}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20" onClick={() => openRsvps(e)}><Users className="h-3.5 w-3.5 mr-1" />RSVPs</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {profile?.role === 'admin' && <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => handleDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
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
