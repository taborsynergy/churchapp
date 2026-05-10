'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader as Loader2, Upload, Eye, EyeOff, Copy, CreditCard, IndianRupee } from 'lucide-react';

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

interface PaymentKeys {
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  razorpay_key_id: string;
  razorpay_key_secret: string;
  razorpay_webhook_secret: string;
}

const EMPTY_KEYS: PaymentKeys = {
  stripe_publishable_key: '',
  stripe_secret_key: '',
  stripe_webhook_secret: '',
  razorpay_key_id: '',
  razorpay_key_secret: '',
  razorpay_webhook_secret: '',
};

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<ChurchSettings>>({ primary_color: '#14b8a6' });
  const [paymentKeys, setPaymentKeys] = useState<PaymentKeys>(EMPTY_KEYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const churchId = profile?.church_id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  useEffect(() => {
    async function load() {
      if (!churchId) { setLoading(false); return; }

      const [{ data: settingsData }, { data: keysData }] = await Promise.all([
        supabase.from('church_settings').select('*').eq('church_id', churchId).maybeSingle(),
        supabase.from('church_payment_keys').select('*').eq('church_id', churchId).maybeSingle(),
      ]);

      if (settingsData) setSettings(settingsData);
      if (keysData) {
        setPaymentKeys({
          stripe_publishable_key: keysData.stripe_publishable_key ?? '',
          stripe_secret_key: keysData.stripe_secret_key ?? '',
          stripe_webhook_secret: keysData.stripe_webhook_secret ?? '',
          razorpay_key_id: keysData.razorpay_key_id ?? '',
          razorpay_key_secret: keysData.razorpay_key_secret ?? '',
          razorpay_webhook_secret: keysData.razorpay_webhook_secret ?? '',
        });
      }
      setLoading(false);
    }
    if (profile !== null) load();
  }, [profile, churchId]);

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !churchId) return;
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
    const path = `logos/${churchId}.${ext}`;
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

  async function saveBranding() {
    if (!churchId) {
      toast({ title: 'Church not found', description: 'Complete onboarding first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('church_settings')
      .upsert({ ...settings, church_id: churchId }, { onConflict: 'church_id' });

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved', description: 'Branding updated successfully.' });
    }
    setSaving(false);
  }

  async function savePaymentKeys() {
    if (!churchId) {
      toast({ title: 'Church not found', description: 'Complete onboarding first.', variant: 'destructive' });
      return;
    }
    setSavingKeys(true);
    const { error } = await supabase
      .from('church_payment_keys')
      .upsert({ church_id: churchId, ...paymentKeys }, { onConflict: 'church_id' });

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Payment keys saved', description: 'Credentials updated. Donations will now use your accounts.' });
    }
    setSavingKeys(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  }

  function brandingField(key: keyof ChurchSettings, label: string, type = 'text') {
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

  function keyField(key: keyof PaymentKeys, label: string, placeholder: string) {
    const visible = showKey[key] ?? false;
    return (
      <div>
        <Label className="text-slate-300 mb-1.5 block text-sm">{label}</Label>
        <div className="relative">
          <Input
            type={visible ? 'text' : 'password'}
            value={paymentKeys[key]}
            onChange={(e) => setPaymentKeys((k) => ({ ...k, [key]: e.target.value }))}
            placeholder={placeholder}
            className="bg-slate-800 border-slate-700 text-white pr-10 font-mono text-sm"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => ({ ...s, [key]: !s[key] }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            aria-label={visible ? 'Hide' : 'Show'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  function WebhookUrl({ url }: { url: string }) {
    return (
      <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 mt-1">
        <code className="text-xs text-teal-400 flex-1 break-all select-all">{url}</code>
        <button
          type="button"
          onClick={() => copyToClipboard(url)}
          className="text-slate-500 hover:text-slate-300 shrink-0"
          aria-label="Copy webhook URL"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
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

  const stripeWebhookUrl = churchId
    ? `${supabaseUrl}/functions/v1/stripe-webhook?church_id=${churchId}`
    : '';
  const razorpayWebhookUrl = churchId
    ? `${supabaseUrl}/functions/v1/razorpay-webhook?church_id=${churchId}`
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-6 w-6 text-teal-400" />
          <h1 className="text-2xl font-bold">Church Settings</h1>
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
            {brandingField('church_name', 'Church Name')}
            {brandingField('contact_email', 'Contact Email', 'email')}
            {brandingField('contact_phone', 'Contact Phone', 'tel')}
            {brandingField('website_url', 'Website URL', 'url')}
            {brandingField('address', 'Address')}
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

          <Button onClick={saveBranding} disabled={saving} className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold h-12">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Branding'}
          </Button>

          {/* ── Payment Gateways ───────────────────────────────── */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-white">Payment Gateways</h2>
              <p className="text-slate-400 text-sm mt-1">
                Donations from your members go directly into your own Stripe and Razorpay accounts.
                Enter your live API keys below.
              </p>
            </div>

            {/* Stripe */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <h3 className="font-medium text-white text-sm">Stripe (USD)</h3>
                <span className="text-slate-500 text-xs">— dashboard.stripe.com</span>
              </div>

              {keyField('stripe_publishable_key', 'Publishable Key', 'pk_live_...')}
              {keyField('stripe_secret_key', 'Secret Key', 'sk_live_...')}
              {keyField('stripe_webhook_secret', 'Webhook Signing Secret', 'whsec_...')}

              {churchId && (
                <div>
                  <Label className="text-slate-400 text-xs block mb-1">
                    Add this URL as your Stripe webhook endpoint → Developers → Webhooks
                  </Label>
                  <WebhookUrl url={stripeWebhookUrl} />
                  <p className="text-slate-500 text-xs mt-1.5">
                    Events to enable: <code className="text-slate-400">checkout.session.completed</code>,{' '}
                    <code className="text-slate-400">checkout.session.expired</code>,{' '}
                    <code className="text-slate-400">charge.refunded</code>
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-700" />

            {/* Razorpay */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee className="h-4 w-4 text-teal-400" />
                <h3 className="font-medium text-white text-sm">Razorpay (INR)</h3>
                <span className="text-slate-500 text-xs">— dashboard.razorpay.com</span>
              </div>

              {keyField('razorpay_key_id', 'Key ID', 'rzp_live_...')}
              {keyField('razorpay_key_secret', 'Key Secret', 'Your Razorpay secret key')}
              {keyField('razorpay_webhook_secret', 'Webhook Secret', 'Set this in Razorpay → Settings → Webhooks')}

              {churchId && (
                <div>
                  <Label className="text-slate-400 text-xs block mb-1">
                    Add this URL as your Razorpay webhook → Settings → Webhooks → Add new webhook
                  </Label>
                  <WebhookUrl url={razorpayWebhookUrl} />
                  <p className="text-slate-500 text-xs mt-1.5">
                    Events to enable: <code className="text-slate-400">payment.captured</code>,{' '}
                    <code className="text-slate-400">payment.failed</code>,{' '}
                    <code className="text-slate-400">refund.created</code>
                  </p>
                </div>
              )}
            </div>

            <Button onClick={savePaymentKeys} disabled={savingKeys} className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold h-12">
              {savingKeys ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Payment Keys'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
