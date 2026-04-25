'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone, Clock, TriangleAlert as AlertTriangle, Info, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PRIORITY_STYLES: Record<string, { badge: string; border: string; icon: any; label: string }> = {
  urgent: { badge: 'bg-red-500/20 text-red-400 border-red-500/30', border: 'border-l-red-500', icon: AlertTriangle, label: 'Urgent' },
  high: { badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30', border: 'border-l-teal-500', icon: ChevronUp, label: 'High Priority' },
  normal: { badge: 'bg-slate-700 text-slate-300 border-slate-600', border: 'border-l-slate-500', icon: Info, label: 'Announcement' },
  low: { badge: 'bg-slate-800 text-slate-400 border-slate-700', border: 'border-l-slate-600', icon: Info, label: 'Info' },
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('published_at', { ascending: false });
      const sorted = (data ?? []).sort((a: Announcement, b: Announcement) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 2;
        const pb = PRIORITY_ORDER[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      });
      setAnnouncements(sorted);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-gradient-to-br from-slate-900 to-teal-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3">Updates</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Church Announcements</h1>
          <p className="text-slate-300 max-w-xl">Stay informed with the latest news, updates, and opportunities at Grace Community Church.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No announcements at this time</p>
            <p className="text-sm mt-1">Check back soon for updates from Grace Community Church.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => {
              const style = PRIORITY_STYLES[ann.priority] ?? PRIORITY_STYLES.normal;
              const Icon = style.icon;
              return (
                <Card key={ann.id} className={cn('border-slate-700/50 bg-slate-900 border-l-4 overflow-hidden', style.border)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border', style.badge)}>
                          <Icon className="h-3.5 w-3.5" />
                          {style.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{format(new Date(ann.published_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-2">{ann.title}</h3>
                    <p className="text-slate-300 leading-relaxed">{ann.body}</p>
                    {ann.expires_at && (
                      <p className="text-xs text-slate-500 mt-3">Expires {format(new Date(ann.expires_at), 'MMMM d, yyyy')}</p>
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
