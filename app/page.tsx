'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Sermon, Event, Announcement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Church, Play, Calendar, Users, Heart, ArrowRight, MapPin, Clock, BookOpen, Mic as Mic2, HandHeart, Megaphone, ChevronRight, Star } from 'lucide-react';
import { format } from 'date-fns';

const VALUES = [
  { icon: BookOpen, title: 'Scripture', desc: 'We believe the Bible is the inspired Word of God — our ultimate authority for faith and life.' },
  { icon: Heart, title: 'Community', desc: 'We are called to love one another deeply, bear each other\'s burdens, and grow together in Christ.' },
  { icon: HandHeart, title: 'Service', desc: 'We serve our city and the world as an expression of the love of Jesus, meeting real needs.' },
  { icon: Mic2, title: 'Worship', desc: 'Authentic, Spirit-led worship is at the heart of who we are — every Sunday and every day.' },
];

const SERVICES = [
  { day: 'Sunday', time: '9:00 AM', type: 'Traditional Service' },
  { day: 'Sunday', time: '11:00 AM', type: 'Contemporary Service' },
  { day: 'Wednesday', time: '7:00 PM', type: 'Bible Study & Prayer' },
  { day: 'Friday', time: '6:30 PM', type: 'Youth Night' },
];

export default function HomePage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: sermonsData }, { data: eventsData }, { data: announcementsData }] = await Promise.all([
        supabase.from('sermons').select('*, sermon_series(*)').eq('is_published', true).order('published_at', { ascending: false }).limit(3),
        supabase.from('events').select('*').eq('is_published', true).gte('start_date', new Date().toISOString()).order('start_date').limit(3),
        supabase.from('announcements').select('*').eq('is_published', true).order('published_at', { ascending: false }).limit(3),
      ]);
      setSermons(sermonsData ?? []);
      setEvents(eventsData ?? []);
      setAnnouncements(announcementsData ?? []);
    }
    load();
  }, []);

  return (
    <div className="bg-slate-950">
      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1000445/pexels-photo-1000445.jpeg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-teal-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.08),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-8">
              <Star className="h-3.5 w-3.5 text-teal-400 fill-teal-400" />
              <span className="text-teal-300 text-sm font-medium tracking-wide">Sundays at 9 AM &amp; 11 AM</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6 tracking-tight">
              Welcome to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300">Grace</span>{' '}
              Community Church
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl">
              A warm, welcoming church family where everyone belongs. Come as you are — experience authentic worship, biblical teaching, and a community that cares.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-xl shadow-teal-500/20 text-base px-8 transition-all hover:shadow-teal-500/30 hover:scale-105" asChild>
                <Link href="/register">Join Our Family</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-500 bg-transparent text-base px-8 transition-all" asChild>
                <Link href="/sermons">
                  <Play className="h-4 w-4 mr-2" />
                  Watch Sermons
                </Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4 text-teal-400" />
                <span className="text-sm">123 Grace Avenue, Springfield, IL</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="h-4 w-4 text-teal-400" />
                <span className="text-sm">Sun 9 AM &amp; 11 AM</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </section>

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <section className="bg-gradient-to-r from-teal-600 to-teal-500 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Megaphone className="h-4 w-4 shrink-0 text-teal-100" />
              <div className="flex gap-8 overflow-x-auto">
                {announcements.map((ann) => (
                  <Link key={ann.id} href="/announcements" className="flex items-center gap-2 shrink-0 hover:text-teal-100 transition-colors text-sm font-medium">
                    <span>{ann.title}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Service Times */}
      <section className="py-16 bg-slate-900 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Join Us for Worship</h2>
            <p className="text-slate-400">Every week is an opportunity to encounter the living God together</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 text-center hover:border-teal-500/30 hover:bg-slate-800 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-teal-500/20 transition-colors border border-teal-500/10">
                  <Church className="h-5 w-5 text-teal-400" />
                </div>
                <p className="font-bold text-white text-sm">{s.day}</p>
                <p className="text-teal-400 font-semibold text-lg">{s.time}</p>
                <p className="text-slate-500 text-xs mt-1">{s.type}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-600 mt-5">
            <MapPin className="h-3.5 w-3.5 inline mr-1 text-teal-500" />
            123 Grace Avenue, Springfield, IL 62701
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/10 mb-3">Our Core Values</Badge>
            <h2 className="text-4xl font-bold text-white mb-4">What We Believe &amp; Live By</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Everything we do flows from our deep convictions about God, people, and the mission of the Church.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v, i) => (
              <Card key={i} className="border-slate-700/50 bg-slate-900/80 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 group">
                <CardContent className="p-7">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/15 flex items-center justify-center mb-5 group-hover:bg-teal-500/20 transition-colors">
                    <v.icon className="h-6 w-6 text-teal-400" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{v.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Sermons */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/10 mb-3">Latest Messages</Badge>
              <h2 className="text-4xl font-bold text-white">Recent Sermons</h2>
            </div>
            <Link href="/sermons" className="hidden sm:flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-medium text-sm transition-colors group">
              View All <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          {sermons.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <Play className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Sermons coming soon. Check back after Sunday service!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sermons.map((sermon) => (
                <Link key={sermon.id} href="/sermons" className="group block">
                  <div className="rounded-xl overflow-hidden border border-slate-700/50 hover:border-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/5 transition-all duration-300 bg-slate-800/60">
                    <div className="relative h-44 bg-gradient-to-br from-teal-900/40 to-slate-800 overflow-hidden">
                      {sermon.thumbnail_url ? (
                        <img src={sermon.thumbnail_url} alt={sermon.title} className="w-full h-full object-cover opacity-60" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Church className="h-16 w-16 text-teal-400/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-teal-500/20 backdrop-blur-sm flex items-center justify-center border border-teal-400/30 group-hover:scale-110 group-hover:bg-teal-500/30 transition-all">
                          <Play className="h-5 w-5 text-teal-300 fill-teal-300 ml-0.5" />
                        </div>
                      </div>
                      {sermon.sermon_series && (
                        <Badge className="absolute top-3 left-3 bg-teal-500/80 text-white text-xs border-0 backdrop-blur-sm">
                          {(sermon.sermon_series as any).title}
                        </Badge>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-white text-base leading-tight mb-1 line-clamp-2 group-hover:text-teal-400 transition-colors">
                        {sermon.title}
                      </h3>
                      <p className="text-sm text-slate-400">{sermon.pastor}</p>
                      {sermon.published_at && (
                        <p className="text-xs text-slate-600 mt-1">{format(new Date(sermon.published_at), 'MMMM d, yyyy')}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/10 mb-3">What&apos;s Happening</Badge>
              <h2 className="text-4xl font-bold text-white">Upcoming Events</h2>
            </div>
            <Link href="/events" className="hidden sm:flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-medium text-sm group">
              View All <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          {events.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No upcoming events. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link key={event.id} href="/events" className="group block">
                  <Card className="h-full border-slate-700/50 bg-slate-900/80 hover:border-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/5 transition-all duration-300">
                    <div className="h-40 bg-gradient-to-br from-slate-700 to-slate-800 rounded-t-lg overflow-hidden relative">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover opacity-70" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="h-14 w-14 text-slate-600" />
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <div className="bg-slate-950/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center min-w-[50px] border border-slate-700/50">
                          <p className="text-xs font-bold text-teal-400 uppercase leading-none">
                            {format(new Date(event.start_date), 'MMM')}
                          </p>
                          <p className="text-xl font-bold text-white leading-tight">
                            {format(new Date(event.start_date), 'd')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-white text-base mb-1 group-hover:text-teal-400 transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1 text-slate-400 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{format(new Date(event.start_date), 'h:mm a')}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-slate-600 text-xs mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-teal-950/20 to-slate-900 relative overflow-hidden border-t border-slate-800/60">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1656564/pexels-photo-1656564.jpeg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.07),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
            <div className="lg:col-span-2">
              <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/10 mb-4">Get Involved</Badge>
              <h2 className="text-4xl font-bold text-white mb-4">New Here? We&apos;d Love to Meet You</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-xl">
                Whether you&apos;re exploring faith for the first time or looking for a church home, you&apos;re welcome here. No pressure, no expectations — just community.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-xl shadow-teal-500/20 hover:shadow-teal-500/30 transition-all hover:scale-105" asChild>
                  <Link href="/register">Create Your Account</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:border-slate-500 bg-transparent transition-all" asChild>
                  <Link href="/groups">Find a Small Group</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: 'Small Groups', value: '24+' },
                { icon: Heart, label: 'Prayer Requests', value: '500+' },
                { icon: Calendar, label: 'Events / Year', value: '100+' },
                { icon: HandHeart, label: 'Volunteers', value: '200+' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 text-center hover:border-teal-500/20 transition-colors">
                  <stat.icon className="h-6 w-6 mx-auto mb-2 text-teal-400" />
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-slate-500 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
