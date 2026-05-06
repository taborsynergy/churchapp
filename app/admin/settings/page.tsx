'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader as Loader2, Upload } from 'lucide-react';

const PALETTE = [
  '#14b8a6', '#6366f1', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
];

interface ChurchSettings {
  church_id: string;
  church_name: string;
  logo_url: string;
  primary_color: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  address: string;
}

export default function AdminSettingsPage() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<ChurchSettings>>({ primary_color: '#14b8a6' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    async function load() {
      // Look up church by admin email
      const { data: church } = await supabase
        .from('churches')
        .select('id')
        .eq('admin_email', user?.email)
        .maybeSingle();

      if (church?.id) {
        const { data } = await supabase
          .from('church_settings')
          .select('*')
          .eq('church_id', church.id)
          .maybeSingle();
        if (data) setSettings(data);
      }
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings.church_id) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Upload a JPG, PNG, or WebP image.', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum logo size is 2 MB.', variant: 'destructive' });
      return;
    }
    setLogoUploading(true);
    const ext = file.name.split('.').pop();
    const path = `logos/${settings.church_id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('church-assets')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' });
    } else {
      const { data: { publicUrl } } = supabase.storage.from('church-assets').getPublicUrl(path);
      setSettings((s) => ({ ...s, logo_url: publicUrl }));
      toast({ title: 'Logo uploaded' });
    }
    setLogoUploading(false);
  }

  async function save() {
    if (!settings.church_id) {
      toast({ title: 'Church not found', description: 'Complete onboarding first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('church_settings')
      .upsert({ ...settings }, { onConflict: 'church_id' });

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved', description: 'Branding updated successfully.' });
    }
    setSaving(false);
  }

  function field(key: keyof ChurchSettings, label: string, type = 'text') {
    return (
      <div>
        <Label className="text-slate-300 mb-1.5 block">{label}</Label>
        <Input
          type={type}
          value={(settings[key] as string) ?? ''}
          onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-6 w-6 text-teal-400" />
          <h1 className="text-2xl font-bold">Church Branding & Settings</h1>
        </div>

        <div className="space-y-8">
          {/* Logo */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
            <h2 className="font-semibold text-white mb-4">Church Logo</h2>
            <div className="flex items-center gap-5">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Church logo" className="w-20 h-20 rounded-xl object-contain bg-slate-800" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                  <Upload className="h-8 w-8" />
                </div>
              )}
              <div>
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" asChild>
                    <span>
                      {logoUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      {logoUploading ? 'Uploading…' : 'Upload Logo'}
                    </span>
                  </Button>
                </Label>
                <input id="logo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadLogo} />
                <p className="text-slate-500 text-xs mt-1.5">JPG, PNG or WebP · Max 2 MB</p>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 space-y-4">
            <h2 className="font-semibold text-white mb-4">Church Identity</h2>
            {field('church_name', 'Church Name')}
            {field('contact_email', 'Contact Email', 'email')}
            {field('contact_phone', 'Contact Phone', 'tel')}
            {field('website_url', 'Website URL', 'url')}
            {field('address', 'Address')}
          </div>

          {/* Colour */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
            <h2 className="font-semibold text-white mb-4">Primary Colour</h2>
            <div className="grid grid-cols-8 gap-2 mb-4">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setSettings((s) => ({ ...s, primary_color: c }))}
                  style={{ backgroundColor: c }}
                  className={`h-9 rounded-lg transition-all ${settings.primary_color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                  aria-label={`Select colour ${c}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-slate-600" style={{ backgroundColor: settings.primary_color }} />
              <Input
                value={settings.primary_color ?? '#14b8a6'}
                onChange={(e) => setSettings((s) => ({ ...s, primary_color: e.target.value }))}
                placeholder="#14b8a6"
                className="w-32 bg-slate-800 border-slate-700 text-white font-mono text-sm"
              />
              <span className="text-slate-500 text-xs">or enter a hex code</span>
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold h-12">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
