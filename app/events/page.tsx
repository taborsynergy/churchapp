'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, EventRsvp } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Clock, Users, Check, Loader as Loader2 } from 'lucide-react';
import { format, isPast } from 'date-fns';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', worship: 'Worship', youth: 'Youth', outreach: 'Outreach', fellowship: 'Fellowship', prayer: 'Prayer',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-slate-700 text-slate-200', worship: 'bg-teal-500/20 text-teal-400',
  youth: 'bg-emerald-500/20 text-emerald-400', outreach: 'bg-orange-500/20 text-orange-400',
  fellowship: 'bg-rose-500/20 text-rose-400', prayer: 'bg-blue-500/20 text-blue-400',
};

export default function EventsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState('upcoming');
  const [category, setCategory] = useState('all');

  async function loadEvents() {
    let query = supabase.from('events').select('*, event_rsvps(*)').eq('is_published', true);
    if (filter === 'upcoming') query = query.gte('start_date', new Date().toISOString()).order('start_date');
    else query = query.lt('start_date', new Date().toISOString()).order('start_date', { ascending: false });
    const { data } = await query;
    setEvents(data ?? []);
    setLoading(false);
  }

  async function loadRsvps() {
    if (!user) return;
    const { data } = await supabase.from('event_rsvps').select('*').eq('user_id', user.id);
    setRsvps(data ?? []);
  }

  useEffect(() => {
    loadEvents();
  }, [filter]);

  useEffect(() => {
    loadRsvps();
  }, [user]);

  async function handleRsvp(eventId: string) {
    if (!user || !profile) {
      toast({ title: 'Sign in required', description: 'Please sign in to RSVP for events.', variant: 'destructive' });
      return;
    }
    if (profile.status !== 'active') {
      toast({ title: 'Account pending', description: 'Your account must be approved to RSVP.', variant: 'destructive' });
      return;
    }
    setRsvpLoading(eventId);
    const existing = rsvps.find((r) => r.event_id === eventId);
    if (existing) {
      await supabase.from('event_rsvps').delete().eq('id', existing.id);
      setRsvps(rsvps.filter((r) => r.id !== existing.id));
      toast({ title: 'RSVP cancelled' });
    } else {
      const event = events.find((e) => e.id === eventId);
      if (event?.capacity !== null && event?.capacity !== undefined) {
        const currentCount = (event.event_rsvps ?? []).length;
        if (currentCount >= event.capacity) {
          toast({ title: 'Event is full', description: 'This event has reached its maximum capacity.', variant: 'destructive' });
          setRsvpLoading(null);
          return;
        }
      }
      const { data } = await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: user.id, status: 'attending' }).select().single();
      if (data) setRsvps([...rsvps, data]);
      toast({ title: 'RSVP confirmed!', description: 'You are registered for this event.' });
    }
    setRsvpLoading(null);
    loadEvents();
  }

  const filtered = events.filter((e) => category === 'all' || e.category === category);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-gradient-to-br from-slate-900 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">Calendar</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Church Events</h1>
          <p className="text-slate-300 max-w-xl">Stay connected with what&apos;s happening at {process.env.NEXT_PUBLIC_SITE_NAME ?? 'our church'}. From Sunday worship to community outreach, there&apos;s always something to be part of.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex gap-2">
            {['upcoming', 'past'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-teal-500 text-white font-semibold' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
              >
                {f} Events
              </button>
            ))}
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-44 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{filter === 'upcoming' ? 'No upcoming events' : 'No past events found'}</p>
            <p className="text-sm mt-1">{filter === 'upcoming' ? 'Check back soon for new events.' : 'Try switching to upcoming events.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event) => {
              const isRsvped = rsvps.some((r) => r.event_id === event.id && r.status === 'attending');
              const rsvpCount = (event.event_rsvps ?? []).length;
              const past = isPast(new Date(event.start_date));

              return (
                <Card key={event.id} className="overflow-hidden border-slate-700/50 bg-slate-900 hover:border-teal-500/30 hover:shadow-lg transition-all duration-300">
                  <div className="h-44 bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover opacity-75" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="h-14 w-14 text-slate-500/30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.general}`}>
                        {CATEGORY_LABELS[event.category]}
                      </span>
                      {past && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-700/80 text-slate-400">Past</span>}
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <div className="bg-slate-900 rounded-lg px-3 py-2 text-center shadow-sm min-w-[52px]">
                        <p className="text-xs font-bold text-teal-400 uppercase leading-none">{format(new Date(event.start_date), 'MMM')}</p>
                        <p className="text-2xl font-bold text-white leading-tight">{format(new Date(event.start_date), 'd')}</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-bold text-white text-base mb-2 line-clamp-2">{event.title}</h3>
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{format(new Date(event.start_date), 'EEEE, MMMM d · h:mm a')}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                      {rsvpCount > 0 && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span>{rsvpCount} attending{event.capacity ? ` · ${event.capacity} capacity` : ''}</span>
                        </div>
                      )}
                    </div>
                    {event.description && <p className="text-sm text-slate-400 line-clamp-2 mb-4">{event.description}</p>}
                    {!past && (
                      <Button
                        size="sm"
                        className={isRsvped ? 'w-full bg-green-600 hover:bg-red-600 text-white' : 'w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold'}
                        onClick={() => handleRsvp(event.id)}
                        disabled={rsvpLoading === event.id}
                      >
                        {rsvpLoading === event.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : isRsvped ? <Check className="h-4 w-4 mr-2" /> : null}
                        {isRsvped ? 'Attending (Click to Cancel)' : 'RSVP — I\'ll Be There'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
