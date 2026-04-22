'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Donation, Group, PrayerRequest, EventRsvp } from '@/lib/types';
import { User, Mail, Phone, MapPin, Heart, Users, DollarSign, Loader as Loader2, Camera, ClipboardCheck, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400',
  staff: 'bg-blue-500/20 text-blue-400',
  member: 'bg-green-500/20 text-green-400',
  pending: 'bg-teal-500/20 text-teal-400',
};

export default function ProfilePage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [myRsvps, setMyRsvps] = useState<any[]>([]);
  const [myPrayers, setMyPrayers] = useState<PrayerRequest[]>([]);
  const [form, setForm] = useState({ full_name: '', phone: '', bio: '', address: '' });

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!loading && user && !profile) {
      supabase
        .from('church_users')
        .insert({ id: user.id, email: user.email ?? '', full_name: user.user_metadata?.full_name ?? '', role: 'pending', status: 'pending' })
        .then(() => refreshProfile());
    }
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name ?? '', phone: profile.phone ?? '', bio: profile.bio ?? '', address: profile.address ?? '' });
      loadData();
    }
  }, [profile]);

  async function loadData() {
    if (!user) return;
    const [{ data: d }, { data: g }, { data: att }, { data: rsvpData }, { data: prayerData }] = await Promise.all([
      supabase.from('donations').select('*, giving_funds(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('group_members').select('*, groups(name, category)').eq('user_id', user.id),
      supabase.from('attendance').select('*, events(title, start_date)').eq('user_id', user.id).eq('present', true).order('marked_at', { ascending: false }).limit(10),
      supabase.from('event_rsvps').select('*, events(title, start_date, location)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('prayer_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setDonations(d ?? []);
    setGroups((g ?? []).map((m: any) => m.groups));
    setAttendanceHistory(att ?? []);
    setMyRsvps(rsvpData ?? []);
    setMyPrayers(prayerData ?? []);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('church_users').update({ ...form, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (error) {
      toast({ title: 'Error saving profile', description: 'Unable to save changes. Please try again.', variant: 'destructive' });
    } else {
      await refreshProfile();
      toast({ title: 'Profile updated!' });
    }
    setSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('church-media').upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Upload failed', description: 'Unable to upload photo. Please try again.', variant: 'destructive' });
    } else {
      const { data } = supabase.storage.from('church-media').getPublicUrl(path);
      await supabase.from('church_users').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      await refreshProfile();
      toast({ title: 'Photo updated!' });
    }
    setUploading(false);
  }

  if (loading || (user && !profile)) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div>;
  }
  if (!user || !profile) return null;

  const initials = (profile.full_name ?? '').split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'GC';
  const totalGiven = donations.filter(d => d.status === 'completed').reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="min-h-screen bg-slate-950 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <p className="text-slate-400 mt-1">Manage your account and view your activity</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-5">
            <Card className="border-slate-700/50 bg-slate-900">
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-teal-500/20 text-teal-400 text-xl font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-400 transition-colors shadow-md">
                    {uploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Camera className="h-4 w-4 text-white" />}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <h2 className="font-bold text-white text-lg">{profile.full_name || 'Your Name'}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{profile.email}</p>
                <div className="flex justify-center gap-2 mt-3">
                  <Badge className={ROLE_COLORS[profile.role] + ' capitalize'}>{profile.role}</Badge>
                  <Badge className={profile.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-teal-500/20 text-teal-400'}>
                    {profile.status}
                  </Badge>
                </div>
                <Separator className="my-4 bg-slate-700/50" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{groups.length}</p>
                    <p className="text-xs text-slate-400">Groups</p>
                  </div>
                  <div className="bg-teal-500/10 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-teal-400">${totalGiven.toFixed(0)}</p>
                    <p className="text-xs text-slate-400">Given</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {groups.length > 0 && (
              <Card className="border-slate-700/50 bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-white"><Users className="h-4 w-4 text-teal-400" />My Groups</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="space-y-2">
                    {groups.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                        <span className="text-slate-200">{g?.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-700/50 bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><User className="h-5 w-5 text-teal-400" />Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Full Name</Label>
                      <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                    </div>
                    <div>
                      <Label className="text-slate-300">Phone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Address</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, State" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Bio</Label>
                    <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Share a bit about yourself..." rows={3} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 mt-1" />
                  </div>
                  <Button type="submit" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            {donations.length > 0 && (
              <Card className="border-slate-700/50 bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><Heart className="h-5 w-5 text-teal-400" />Giving History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {donations.map((don) => (
                      <div key={don.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-white">{(don.giving_funds as any)?.name ?? 'General Fund'}</p>
                          <p className="text-xs text-slate-500">{format(new Date(don.created_at), 'MMM d, yyyy')} · {don.payment_type === 'recurring' ? 'Monthly' : 'One-time'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">${Number(don.amount).toFixed(2)}</p>
                          <Badge className={don.status === 'completed' ? 'bg-green-500/20 text-green-400 text-xs' : 'bg-teal-500/20 text-teal-400 text-xs'}>
                            {don.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {attendanceHistory.length > 0 && (
              <Card className="border-slate-700/50 bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><ClipboardCheck className="h-5 w-5 text-teal-400" />Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {attendanceHistory.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-white">{a.events?.title ?? 'Unknown Event'}</p>
                          <p className="text-xs text-slate-500">
                            {a.events?.start_date ? format(new Date(a.events.start_date), 'MMM d, yyyy') : '—'}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">Present</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {myRsvps.length > 0 && (
              <Card className="border-slate-700/50 bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><Calendar className="h-5 w-5 text-teal-400" />My Events (RSVPs)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myRsvps.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-white">{r.events?.title ?? 'Unknown Event'}</p>
                          <p className="text-xs text-slate-500">
                            {r.events?.start_date ? format(new Date(r.events.start_date), 'MMM d, yyyy') : '—'}
                            {r.events?.location ? ` · ${r.events.location}` : ''}
                          </p>
                        </div>
                        <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs capitalize">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {myPrayers.length > 0 && (
              <Card className="border-slate-700/50 bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><Heart className="h-5 w-5 text-teal-400" />My Prayer Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myPrayers.map((p) => (
                      <div key={p.id} className="py-2 border-b border-slate-800 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-white">{p.title}</p>
                          <Badge className={p.status === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs' : p.status === 'open' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs' : 'bg-slate-700/50 text-slate-400 text-xs'}>
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{format(new Date(p.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
