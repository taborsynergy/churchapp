'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Share2, Loader as Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/ui/auth-guard';
import { LockedModule } from '@/components/ui/locked-module';
import { useAuth } from '@/components/providers/AuthProvider';

interface Verse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

const POPULAR = [
  { ref: 'John 3:16', label: 'John 3:16' },
  { ref: 'Psalm 23:1', label: 'Psalm 23:1' },
  { ref: 'Romans 8:28', label: 'Romans 8:28' },
  { ref: 'Philippians 4:13', label: 'Phil 4:13' },
  { ref: 'Jeremiah 29:11', label: 'Jer 29:11' },
  { ref: 'Isaiah 40:31', label: 'Isaiah 40:31' },
];

// Uses the free bible-api.com (no key required, KJV)
async function fetchVerse(ref: string): Promise<Verse[]> {
  const encoded = encodeURIComponent(ref.trim());
  const res = await fetch(`https://bible-api.com/${encoded}`);
  if (!res.ok) throw new Error('Verse not found');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return (data.verses ?? []).map((v: any) => ({
    book_name: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text.trim(),
  }));
}

export default function BiblePage() {
  const { canAccess } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState('');

  async function search(ref?: string) {
    const q = ref ?? query;
    if (!q.trim()) return;
    setLoading(true);
    setVerses([]);
    try {
      const results = await fetchVerse(q);
      setVerses(results);
      setSearched(q);
    } catch (err: any) {
      toast({ title: 'Not found', description: err.message ?? 'Could not find that verse. Try "John 3:16" or "Psalm 23".', variant: 'destructive' });
    }
    setLoading(false);
  }

  function share(verse: Verse) {
    const text = `"${verse.text}" — ${verse.book_name} ${verse.chapter}:${verse.verse}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: 'Copied to clipboard' });
      });
    }
  }

  return (
    <AuthGuard>
      {!canAccess('bible') ? <LockedModule moduleName="Bible" requiredPlan="parish" /> : <div className="min-h-screen bg-slate-950 text-white pb-16">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-5">
          <BookOpen className="h-8 w-8 text-teal-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Bible</h1>
        <p className="text-slate-400">Search any verse or passage (KJV)</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {/* Search bar */}
        <div className="flex gap-2 mb-5">
          <Input
            placeholder='e.g. "John 3:16" or "Psalm 23"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <Button onClick={() => search()} disabled={loading} className="bg-teal-500 hover:bg-teal-400 text-white shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Quick refs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {POPULAR.map((p) => (
            <button
              key={p.ref}
              onClick={() => { setQuery(p.ref); search(p.ref); }}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-teal-500/50 hover:text-teal-400 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {verses.length > 0 && (
          <div className="space-y-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide">
              {verses.length} verse{verses.length !== 1 ? 's' : ''} · {searched}
            </p>
            {verses.map((v, i) => (
              <div key={i} className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="mb-3 border-teal-500/30 text-teal-400 text-xs">
                      {v.book_name} {v.chapter}:{v.verse}
                    </Badge>
                    <p className="text-slate-200 leading-relaxed italic">&ldquo;{v.text}&rdquo;</p>
                  </div>
                  <button
                    onClick={() => share(v)}
                    aria-label="Share verse"
                    className="text-slate-500 hover:text-teal-400 transition-colors shrink-0 mt-1"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && verses.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <BookOpen className="h-14 w-14 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Search for a verse to begin</p>
            <p className="text-sm mt-1">Try &quot;John 3:16&quot; or &quot;Psalm 23&quot;</p>
          </div>
        )}
      </div>
    </div>}
  </AuthGuard>
  );
}
