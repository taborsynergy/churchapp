'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Check, X, Loader as Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';

function limitWords(text: string, max = 20): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text;
  return words.slice(0, max).join(' ') + '…';
}

export default function AdminAttendancePage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [rsvpMemberIds, setRsvpMemberIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: mem }] = await Promise.all([
        supabase.from('events').select('id, title, start_date').eq('is_published', true).order('start_date', { ascending: false }).limit(30),
        supabase.from('church_users').select('*').eq('status', 'active').order('full_name'),
      ]);
      setEvents(ev ?? []);
      setMembers(mem ?? []);
      if (ev && ev.length > 0) setSelectedEvent(ev[0].id);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    async function loadAttendance() {
      const [{ data: att }, { data: rsvps }] = await Promise.all([
        supabase.from('attendance').select('*').eq('event_id', selectedEvent),
        supabase.from('event_rsvps').select('user_id').eq('event_id', selectedEvent),
      ]);
      const map: Record<string, boolean> = {};
      (att ?? []).forEach((a: any) => { map[a.user_id] = a.present; });
      setAttendance(map);
      setRsvpMemberIds(new Set((rsvps ?? []).map((r: any) => r.user_id)));
    }
    loadAttendance();
  }, [selectedEvent]);

  function toggle(userId: string) {
    setAttendance((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  const hasRsvps = rsvpMemberIds.size > 0;
  const filteredMembers = hasRsvps ? members.filter((m) => rsvpMemberIds.has(m.id)) : members;

  function markAll(present: boolean) {
    const all: Record<string, boolean> = {};
    filteredMembers.forEach((m) => { all[m.id] = present; });
    setAttendance(all);
  }

  async function handleSave() {
    if (!selectedEvent) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast({ title: 'Not authenticated', description: 'Please log in again.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const records = filteredMembers.map((m) => ({ user_id: m.id, present: attendance[m.id] ?? false }));
    const res = await fetch('/api/admin/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ event_id: selectedEvent, records }),
    });
    const json = await res.json();

    if (!res.ok) {
      toast({ title: 'Error saving attendance', description: json.error || 'Unable to save attendance.', variant: 'destructive' });
    } else {
      toast({ title: 'Attendance saved!' });
    }
    setSaving(false);
  }

  const presentCount = filteredMembers.filter((m) => attendance[m.id]).length;
  const selectedEventData = events.find((e) => e.id === selectedEvent);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Attendance</h1>
        <p className="text-slate-400 text-sm mt-1">Mark and track member attendance for events and services.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
        <div className="flex-1">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-full sm:w-96">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent className="max-w-96">
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id} className="whitespace-normal break-words">
                  {limitWords(e.title)} — {format(new Date(e.start_date), 'MMM d, yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs" onClick={() => markAll(true)}>
            <Check className="h-3.5 w-3.5 mr-1" />Mark All Present
          </Button>
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs" onClick={() => markAll(false)}>
            <X className="h-3.5 w-3.5 mr-1" />Clear All
          </Button>
        </div>
      </div>

      {selectedEventData && (
        <div className="mb-4 flex items-center gap-4">
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {presentCount} / {filteredMembers.length} present
          </Badge>
          {filteredMembers.length > 0 && (
            <span className="text-xs text-slate-500">
              {Math.round((presentCount / filteredMembers.length) * 100)}% attendance rate
            </span>
          )}
        </div>
      )}

      {!selectedEvent ? (
        <div className="text-center py-20 text-slate-500">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select an event to view RSVPs.</p>
        </div>
      ) : (
        <>
        {!hasRsvps && (
          <p className="text-xs text-slate-500 mb-3">No RSVPs for this event — showing all active members.</p>
        )}
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3 font-semibold text-slate-400">Member</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-400">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const initials = m.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                const isPresent = attendance[m.id] ?? false;
                return (
                  <tr key={m.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 max-w-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={m.avatar_url} />
                          <AvatarFallback className="bg-teal-500/10 text-teal-400 text-xs font-semibold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-white break-words">{m.full_name}</p>
                          <p className="text-xs text-slate-500 break-all">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(m.id)}
                        className={`w-24 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                          isPresent
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30'
                        }`}
                      >
                        {isPresent ? '✓ Present' : '✗ Absent'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {filteredMembers.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold" onClick={handleSave} disabled={saving || !selectedEvent}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      )}
    </div>
  );
}
