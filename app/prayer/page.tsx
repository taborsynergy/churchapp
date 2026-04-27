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
import { Heart, Plus, Loader as Loader2, User, Clock, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PendingApprovalScreen } from '@/components/ui/pending-approval';
import { adminWrite } from '@/lib/admin-write';
import { format } from 'date-fns';

const CATEGORIES = ['general', 'health', 'family', 'finances', 'relationships', 'guidance', 'praise'];
const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-slate-700 text-slate-200', health: 'bg-rose-500/20 text-rose-400',
  family: 'bg-teal-500/20 text-teal-400', finances: 'bg-green-500/20 text-green-400',
  relationships: 'bg-pink-500/20 text-pink-400', guidance: 'bg-blue-500/20 text-blue-400',
  praise: 'bg-yellow-500/20 text-yellow-400',
};

const TITLE_MAX = 100;
const BODY_MAX = 500;
const ANSWER_WORD_LIMIT = 100;
const CARD_TRUNCATE = 200;

function countWords(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export default function PrayerPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [allRequests, setAllRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', body: '', category: 'general', is_anonymous: false });
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answerTarget, setAnswerTarget] = useState<PrayerRequest | null>(null);
  const [answerNote, setAnswerNote] = useState('');
  const [answering, setAnswering] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';

  const displayed = filter === 'all' ? allRequests : allRequests.filter((r) => r.status === filter);
  const openCount = allRequests.filter((r) => r.status === 'open').length;
  const answeredCount = allRequests.filter((r) => r.status === 'answered').length;

  const titleCharsLeft = TITLE_MAX - form.title.length;
  const bodyCharsLeft = BODY_MAX - form.body.length;
  const answerWords = countWords(answerNote);

  async function load() {
    const { data } = await supabase
      .from('prayer_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setAllRequests(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this prayer request?')) return;
    const { error } = await adminWrite('prayer_requests', 'delete', undefined, id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Prayer request deleted' });
      load();
    }
  }

  function openAnswerDialog(req: PrayerRequest) {
    setAnswerTarget(req);
    setAnswerNote('');
    setAnswerOpen(true);
  }

  async function handleMarkAnswered() {
    if (!answerTarget) return;
    if (answerNote.trim() && answerWords > ANSWER_WORD_LIMIT) {
      toast({ title: 'Response too long', description: `Please keep your response to ${ANSWER_WORD_LIMIT} words or less.`, variant: 'destructive' });
      return;
    }
    setAnswering(true);
    const note = answerNote.trim() || null;

    // Try full update with answer_note
    const { error } = await adminWrite('prayer_requests', 'update', { status: 'answered', answer_note: note }, answerTarget.id);

    if (error) {
      // Column may not exist yet — fall back to status-only update
      if (error.message?.includes('answer_note')) {
        const { error: fallback } = await adminWrite('prayer_requests', 'update', { status: 'answered' }, answerTarget.id);
        if (fallback) {
          toast({ title: 'Update failed', description: fallback.message, variant: 'destructive' });
          setAnswering(false);
          return;
        }
        toast({
          title: 'Marked as answered',
          description: note ? 'Admin response could not be saved — the answer_note column is missing. Run the DB migration in Supabase SQL Editor.' : undefined,
          variant: note ? 'destructive' : 'default',
        });
        setAllRequests((prev) => prev.map((r) => r.id === answerTarget.id ? { ...r, status: 'answered' } : r));
      } else {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
        setAnswering(false);
        return;
      }
    } else {
      toast({ title: 'Marked as answered!', description: 'This prayer request has been marked as answered.' });
      setAllRequests((prev) => prev.map((r) => r.id === answerTarget.id ? { ...r, status: 'answered', answer_note: note } : r));
    }

    setAnswerOpen(false);
    setAnswerTarget(null);
    setAnswering(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to submit a prayer request.', variant: 'destructive' });
      return;
    }
    if (profile?.status !== 'active') {
      toast({ title: 'Account pending', description: 'Your account must be approved before submitting.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('prayer_requests').insert({
      user_id: user.id,
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      is_anonymous: form.is_anonymous,
      status: 'open',
    });
    if (error) {
      toast({ title: 'Error', description: 'Unable to submit request. Please try again.', variant: 'destructive' });
    } else {
      toast({ title: 'Prayer request submitted', description: 'Our community will be praying with you.' });
      setForm({ title: '', body: '', category: 'general', is_anonymous: false });
      setOpen(false);
      load();
    }
    setSubmitting(false);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!authLoading && user && profile?.status !== 'active') {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mark Answered dialog for admin/staff */}
      <Dialog open={answerOpen} onOpenChange={setAnswerOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="text-white">Mark as Answered</DialogTitle>
          </DialogHeader>
          {answerTarget && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">Prayer Request</p>
                <p className="font-medium text-white text-sm break-words">{answerTarget.title}</p>
                <p className="text-xs text-slate-400 mt-1 break-words line-clamp-3">{answerTarget.body}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-slate-300">
                    Admin Response{' '}
                    <span className="text-slate-500 font-normal">(optional)</span>
                  </Label>
                  <span className={`text-xs ${answerWords > ANSWER_WORD_LIMIT ? 'text-red-400 font-medium' : 'text-slate-500'}`}>
                    {answerWords} / {ANSWER_WORD_LIMIT} words
                  </span>
                </div>
                <Textarea
                  value={answerNote}
                  onChange={(e) => setAnswerNote(e.target.value)}
                  placeholder="Write a brief testimony or note about how this prayer was answered (optional)…"
                  rows={4}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
                {answerWords > ANSWER_WORD_LIMIT && (
                  <p className="text-xs text-red-400 mt-1">
                    {answerWords - ANSWER_WORD_LIMIT} word{answerWords - ANSWER_WORD_LIMIT !== 1 ? 's' : ''} over the limit
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={() => setAnswerOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  onClick={handleMarkAnswered}
                  disabled={answering || answerWords > ANSWER_WORD_LIMIT}
                >
                  {answering && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm Answered
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">Intercession</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Prayer Wall</h1>
          <p className="text-slate-300 max-w-xl">Lift one another up in prayer. Share your requests and stand in agreement with your church family. We believe God hears and answers prayer.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Admin summary bar */}
        {isAdmin && !loading && (
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-900 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <span className="text-white font-semibold">{openCount}</span>
              <span className="text-slate-400">need prayer</span>
            </div>
            <div className="w-px bg-slate-700/50 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-white font-semibold">{answeredCount}</span>
              <span className="text-slate-400">answered</span>
            </div>
            <div className="w-px bg-slate-700/50 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">{allRequests.length} total requests</span>
            </div>
          </div>
        )}

        {/* Filters + Submit button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All Requests', count: allRequests.length },
              { key: 'open', label: 'Needs Prayer', count: openCount },
              { key: 'answered', label: 'Answered', count: answeredCount },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-teal-500 text-white font-semibold'
                    : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {label}
                {!loading && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === key ? 'bg-teal-400/30 text-teal-100' : 'bg-slate-700/80 text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shrink-0"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    toast({ title: 'Sign in required', description: 'Please sign in to share a prayer request.', variant: 'destructive' });
                  }
                }}
              >
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
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-slate-300">
                      Title <span className="text-red-400" aria-hidden="true">*</span>
                    </Label>
                    <span className={`text-xs ${titleCharsLeft < 15 ? 'text-red-400' : 'text-slate-500'}`}>
                      {titleCharsLeft} left
                    </span>
                  </div>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, TITLE_MAX) })}
                    placeholder="Brief title for your request"
                    required
                    maxLength={TITLE_MAX}
                    aria-required="true"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
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
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-slate-300">
                      Prayer Request <span className="text-red-400" aria-hidden="true">*</span>
                    </Label>
                    <span className={`text-xs ${bodyCharsLeft < 50 ? 'text-red-400' : 'text-slate-500'}`}>
                      {bodyCharsLeft} left
                    </span>
                  </div>
                  <Textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value.slice(0, BODY_MAX) })}
                    placeholder="Share your prayer need… (max 500 characters)"
                    rows={4}
                    required
                    maxLength={BODY_MAX}
                    aria-required="true"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
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

        {/* Prayer cards */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {filter === 'open' ? 'No open prayer requests' : filter === 'answered' ? 'No answered prayers yet' : 'No prayer requests yet'}
            </p>
            <p className="text-sm mt-1">
              {filter === 'all' ? 'Be the first to share a prayer need' : 'Switch to "All Requests" to see everything'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((req) => {
              const isExpanded = expanded.has(req.id);
              const needsTruncation = req.body.length > CARD_TRUNCATE;
              const bodyText = needsTruncation && !isExpanded
                ? req.body.slice(0, CARD_TRUNCATE) + '…'
                : req.body;

              return (
                <Card
                  key={req.id}
                  className={`bg-slate-900 transition-colors ${
                    req.status === 'answered'
                      ? 'border border-emerald-500/30 border-l-2 border-l-emerald-500'
                      : isAdmin
                        ? 'border border-slate-700/50 border-l-2 border-l-amber-500/50'
                        : 'border border-slate-700/50 hover:border-teal-500/30'
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${CATEGORY_COLORS[req.category]}`}>
                          {req.category}
                        </span>
                        {req.status === 'answered' ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1 shrink-0">
                            <CheckCircle className="h-3 w-3" />
                            Answered
                          </span>
                        ) : isAdmin ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                            Needs Prayer
                          </span>
                        ) : null}
                      </div>

                      <h3 className="font-semibold text-white mb-1 break-words overflow-wrap-anywhere">
                        {req.title}
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap overflow-hidden">
                        {bodyText}
                      </p>
                      {needsTruncation && (
                        <button
                          onClick={() => toggleExpand(req.id)}
                          className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 mt-1.5 transition-colors"
                        >
                          {isExpanded
                            ? <><ChevronUp className="h-3 w-3" />Show less</>
                            : <><ChevronDown className="h-3 w-3" />Read more</>}
                        </button>
                      )}

                      {req.status === 'answered' && req.answer_note && (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Admin Response
                          </p>
                          <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                            {req.answer_note}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {req.is_anonymous ? 'Anonymous' : (req.users as any)?.full_name || 'Member'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{format(new Date(req.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <button className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium shrink-0">
                        <Heart className="h-3.5 w-3.5" />
                        Praying
                      </button>

                      {isAdmin && (
                        <div className="ml-auto flex items-center gap-3 shrink-0">
                          {req.status !== 'answered' && (
                            <button
                              onClick={() => openAnswerDialog(req)}
                              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Mark Answered
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(req.id)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
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
