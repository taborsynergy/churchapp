'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PrayerRequest } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Heart, Plus, Loader as Loader2, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['general', 'health', 'family', 'finances', 'relationships', 'guidance', 'praise'];
const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-slate-700 text-slate-200', health: 'bg-rose-500/20 text-rose-400',
  family: 'bg-teal-500/20 text-teal-400', finances: 'bg-green-500/20 text-green-400',
  relationships: 'bg-pink-500/20 text-pink-400', guidance: 'bg-blue-500/20 text-blue-400',
  praise: 'bg-yellow-500/20 text-yellow-400',
};

export default function PrayerPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', body: '', category: 'general', is_anonymous: false });

  async function load() {
    let query = supabase.from('prayer_requests').select('*, users(full_name, avatar_url)').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setRequests(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to submit a prayer request.', variant: 'destructive' });
      return;
    }
    if (profile?.status !== 'active') {
      toast({ title: 'Account pending', description: 'Your account must be approved.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('prayer_requests').insert({
      user_id: user.id,
      title: form.title,
      body: form.body,
      category: form.category,
      is_anonymous: form.is_anonymous,
      status: 'open',
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Prayer request submitted', description: 'Our community will be praying with you.' });
      setForm({ title: '', body: '', category: 'general', is_anonymous: false });
      setOpen(false);
      load();
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-gradient-to-br from-slate-900 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">Intercession</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Prayer Wall</h1>
          <p className="text-slate-300 max-w-xl">Lift one another up in prayer. Share your requests and stand in agreement with your church family. We believe God hears and answers prayer.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'answered'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-teal-500 text-white font-semibold' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
              >
                {f === 'all' ? 'All Requests' : f === 'open' ? 'Needs Prayer' : 'Answered'}
              </button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Share a Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700/50">
              <DialogHeader>
                <DialogTitle className="text-white">Submit a Prayer Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-slate-300">Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief title for your request" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Prayer Request</Label>
                  <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Share your prayer need..." rows={4} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="anon" checked={form.is_anonymous} onCheckedChange={(checked) => setForm({ ...form, is_anonymous: !!checked })} />
                  <Label htmlFor="anon" className="font-normal text-slate-400 cursor-pointer">Post anonymously</Label>
                </div>
                <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No prayer requests yet</p>
            <p className="text-sm mt-1">Be the first to share a prayer need</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <Card key={req.id} className="border-slate-700/50 bg-slate-900 hover:border-teal-500/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[req.category]}`}>
                          {req.category}
                        </span>
                        {req.status === 'answered' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Answered!</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white mb-1">{req.title}</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">{req.body}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <User className="h-3.5 w-3.5" />
                      <span>{req.is_anonymous ? 'Anonymous' : (req.users as any)?.full_name || 'Member'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{format(new Date(req.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <button className="ml-auto flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium">
                      <Heart className="h-3.5 w-3.5" />
                      Praying
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
