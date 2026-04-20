'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Sermon, SermonSeries } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Church, Play, Search, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function SermonsPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [series, setSeries] = useState<SermonSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('all');

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: sr }] = await Promise.all([
        supabase.from('sermons').select('*, sermon_series(*)').eq('is_published', true).order('published_at', { ascending: false }),
        supabase.from('sermon_series').select('*').eq('is_active', true),
      ]);
      setSermons(s ?? []);
      setSeries(sr ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = sermons.filter((s) => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.pastor.toLowerCase().includes(search.toLowerCase());
    const matchSeries = selectedSeries === 'all' || s.series_id === selectedSeries;
    return matchSearch && matchSeries;
  });

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-gradient-to-br from-slate-900 to-teal-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3">Messages</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Sermon Library</h1>
          <p className="text-slate-300 max-w-xl">Revisit past messages, explore sermon series, and grow deeper in your faith through God&apos;s Word.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input placeholder="Search by title or pastor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
          </div>
          <Select value={selectedSeries} onValueChange={setSelectedSeries}>
            <SelectTrigger className="w-full sm:w-56 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Filter by series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {series.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-slate-700/50 animate-pulse">
                <div className="h-48 bg-slate-800" />
                <div className="p-5 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Play className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No sermons found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((sermon) => (
              <div key={sermon.id} className="group rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900 hover:border-teal-500/30 hover:shadow-lg transition-all duration-300">
                <div className="relative h-48 bg-gradient-to-br from-teal-700 to-slate-800">
                  {sermon.thumbnail_url ? (
                    <img src={sermon.thumbnail_url} alt={sermon.title} className="w-full h-full object-cover opacity-75" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Church className="h-16 w-16 text-teal-300/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform cursor-pointer">
                      <Play className="h-6 w-6 text-white fill-white ml-1" />
                    </div>
                  </div>
                  {(sermon.sermon_series as any)?.title && (
                    <Badge className="absolute top-3 left-3 bg-teal-500/90 text-white text-xs border-0 font-semibold">
                      {(sermon.sermon_series as any).title}
                    </Badge>
                  )}
                  {sermon.duration_minutes > 0 && (
                    <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sermon.duration_minutes} min
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-white text-base leading-tight mb-1.5 group-hover:text-teal-400 transition-colors line-clamp-2">
                    {sermon.title}
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">{sermon.pastor}</p>
                  {sermon.scripture_reference && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <BookOpen className="h-3.5 w-3.5 text-teal-400" />
                      <span className="text-xs text-teal-400 font-medium">{sermon.scripture_reference}</span>
                    </div>
                  )}
                  {sermon.published_at && (
                    <p className="text-xs text-slate-500 mt-2">{format(new Date(sermon.published_at), 'MMMM d, yyyy')}</p>
                  )}
                  {sermon.description && (
                    <p className="text-sm text-slate-400 mt-3 line-clamp-2 leading-relaxed">{sermon.description}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    {sermon.video_url && (
                      <a href={sermon.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md px-3 py-1.5 hover:bg-teal-500/20 transition-colors font-medium">
                        <Play className="h-3 w-3 fill-teal-400" /> Watch
                      </a>
                    )}
                    {sermon.audio_url && (
                      <a href={sermon.audio_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-md px-3 py-1.5 hover:bg-slate-700 transition-colors font-medium">
                        Listen
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
