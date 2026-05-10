import { createServerSupabase } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { SermonsClient } from './sermons-client';
import { AuthGuard } from '@/components/ui/auth-guard';

export const revalidate = 60;

export default async function SermonsPage() {
  const supabase = createServerSupabase();
  const [{ data: sermons }, { data: series }] = await Promise.all([
    supabase.from('sermons').select('*, sermon_series(*)').eq('is_published', true).order('published_at', { ascending: false }),
    supabase.from('sermon_series').select('*').eq('is_active', true),
  ]);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-gradient-to-br from-slate-900 to-teal-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3">Messages</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Sermon Library</h1>
          <p className="text-slate-300 max-w-xl">Revisit past messages, explore sermon series, and grow deeper in your faith through God&apos;s Word.</p>
        </div>
      </div>
      <AuthGuard><SermonsClient sermons={sermons ?? []} series={series ?? []} /></AuthGuard>
    </div>
  );
}
