'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Mic, Play, Pause, SkipBack, SkipForward,
  Volume2, Download, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { AuthGuard } from '@/components/ui/auth-guard';
import { LockedModule } from '@/components/ui/locked-module';
import { useAuth } from '@/components/providers/AuthProvider';

interface Episode {
  id: string;
  title: string;
  speaker: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  published_at: string;
  series_title: string | null;
}

function formatDuration(secs: number | null) {
  if (!secs) return '--:--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SPEEDS = [1, 1.25, 1.5, 2];

export default function PodcastPage() {
  const { canAccess } = useAuth();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Episode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    supabase
      .from('sermons')
      .select('id, title, speaker, description, audio_url, duration_seconds, published_at, sermon_series(title)')
      .not('audio_url', 'is', null)
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        const mapped = (data ?? []).map((s: any) => ({
          ...s,
          series_title: s.sermon_series?.title ?? null,
          audio_url: s.audio_url ?? '',
        })) as Episode[];
        setEpisodes(mapped);
        setLoading(false);
      });
  }, []);

  // Audio event wiring
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onEnded = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [current]);

  function play(ep: Episode) {
    if (current?.id === ep.id) {
      togglePlay();
      return;
    }
    setCurrent(ep);
    setProgress(0);
    setPlaying(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = ep.audio_url;
        audioRef.current.playbackRate = SPEEDS[speedIdx];
        audioRef.current.play().catch(() => {});
      }
    }, 50);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }

  function seek(val: number[]) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = val[0];
    setProgress(val[0]);
  }

  function skip(secs: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + secs);
  }

  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }

  return (
    <AuthGuard>
      {!canAccess('podcast') ? <LockedModule moduleName="Podcast" requiredPlan="parish" /> : <div className="min-h-screen bg-slate-950 text-white pb-32">
      <audio ref={audioRef} />

      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-5">
          <Mic className="h-8 w-8 text-teal-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Podcast</h1>
        <p className="text-slate-400">Listen to sermons and teachings on the go</p>
      </div>

      {/* Episode list */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Mic className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No episodes yet</p>
            <p className="text-sm mt-1">Audio sermons will appear here once uploaded.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {episodes.map((ep) => {
              const isActive = current?.id === ep.id;
              return (
                <div
                  key={ep.id}
                  className={`rounded-xl border p-5 cursor-pointer transition-all ${
                    isActive
                      ? 'border-teal-500 bg-teal-500/5'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                  }`}
                  onClick={() => play(ep)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-teal-500' : 'bg-slate-700'
                    }`}>
                      {isActive && playing
                        ? <Pause className="h-5 w-5 text-white" />
                        : <Play className="h-5 w-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{ep.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{ep.speaker}</p>
                      {ep.series_title && (
                        <Badge variant="outline" className="mt-1.5 text-xs border-teal-500/40 text-teal-400">
                          {ep.series_title}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-slate-500 text-xs flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {formatDuration(ep.duration_seconds)}
                      </p>
                      <p className="text-slate-600 text-xs mt-1">
                        {format(new Date(ep.published_at), 'd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent player */}
      {current && (
        <div className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-700 px-4 py-4 z-50">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{current.title}</p>
                <p className="text-slate-400 text-xs">{current.speaker}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white px-2" onClick={() => skip(-15)}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={togglePlay} className="bg-teal-500 hover:bg-teal-400 text-white w-9 h-9 rounded-full p-0">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white px-2" onClick={() => skip(30)}>
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white text-xs font-bold w-10" onClick={cycleSpeed}>
                  {SPEEDS[speedIdx]}x
                </Button>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white px-2" asChild>
                  <a href={current.audio_url} download aria-label="Download episode">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="w-10 text-right">{formatDuration(Math.floor(progress))}</span>
              <Slider
                value={[progress]}
                max={duration || 1}
                step={1}
                onValueChange={seek}
                className="flex-1"
              />
              <span className="w-10">{formatDuration(Math.floor(duration))}</span>
              <Volume2 className="h-4 w-4 ml-1 text-slate-600" />
            </div>
          </div>
        </div>
      )}
    </div>}
  </AuthGuard>
  );
}
