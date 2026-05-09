'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Church, Palette, Rocket, ChevronRight, ChevronLeft, Loader as Loader2 } from 'lucide-react';

const STEPS = [
  { title: 'Name your church', icon: Church, description: 'Set your church name and contact email.' },
  { title: 'Choose your colour', icon: Palette, description: 'Pick a primary colour for your church app.' },
  { title: "You're ready!", icon: Rocket, description: 'Your church is set up. Go to your dashboard.' },
];

const PALETTE = [
  '#14b8a6', '#6366f1', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
];

export default function OnboardingPage() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [churchName, setChurchName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [color, setColor] = useState('#14b8a6');
  const [saving, setSaving] = useState(false);

  async function saveAndFinish() {
    if (!churchName.trim()) {
      toast({ title: 'Church name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Create church record & set settings (trial license auto-provisioned by trigger)
      const { data: church, error: churchErr } = await supabase
        .from('churches')
        .insert({ name: churchName.trim(), admin_email: contactEmail || user?.email })
        .select('id')
        .single();

      if (churchErr) throw churchErr;

      await supabase.from('church_settings').upsert({
        church_id: church.id,
        church_name: churchName.trim(),
        contact_email: contactEmail,
        primary_color: color,
        onboarding_done: true,
      }, { onConflict: 'church_id' });

      // Promote the registering user to church admin
      await supabase.from('church_users').upsert({
        id: user!.id,
        email: user!.email ?? '',
        full_name: user!.user_metadata?.full_name ?? user!.user_metadata?.name ?? '',
        role: 'admin',
        status: 'active',
        church_id: church.id,
      }, { onConflict: 'id' });

      toast({ title: 'Church set up!', description: 'Your 14-day free trial has started.' });
      router.push('/admin');
    } catch (err: any) {
      toast({ title: 'Setup failed', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 transition-all ${i < step ? 'bg-teal-500' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8">
          <div className="w-14 h-14 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto mb-5">
            <StepIcon className="h-7 w-7 text-teal-400" />
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-1">{STEPS[step].title}</h2>
          <p className="text-slate-400 text-sm text-center mb-8">{STEPS[step].description}</p>

          {/* Step 0 — Church name */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">Church Name <span className="text-red-400">*</span></Label>
                <Input
                  placeholder="e.g. Grace Community Church"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">Admin Contact Email</Label>
                <Input
                  type="email"
                  placeholder="pastor@church.org"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          )}

          {/* Step 1 — Colour picker */}
          {step === 1 && (
            <div>
              <p className="text-slate-400 text-sm mb-4 text-center">Select your brand colour</p>
              <div className="grid grid-cols-4 gap-3">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-12 rounded-xl transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : 'hover:scale-105'}`}
                    aria-label={`Select colour ${c}`}
                  />
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: color }} />
                <div>
                  <p className="text-white font-medium text-sm">{churchName || 'Your Church'}</p>
                  <p className="text-slate-400 text-xs">This colour will appear across your app</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div className="text-center">
              <p className="text-slate-300 mb-2">Your 14-day free trial has started.</p>
              <p className="text-slate-400 text-sm">Upload your first sermon or create an event to get started.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                className="bg-teal-500 hover:bg-teal-400 text-white font-semibold"
                onClick={() => {
                  if (step === 0 && !churchName.trim()) {
                    toast({ title: 'Church name is required', variant: 'destructive' });
                    return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="bg-teal-500 hover:bg-teal-400 text-white font-semibold"
                onClick={saveAndFinish}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
                {saving ? 'Setting up…' : 'Go to Dashboard'}
              </Button>
            )}
          </div>
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          ChurchConnect by{' '}
          <a href="https://taborsynergy.com" className="text-teal-500 hover:underline">Tabor Synergy</a>
        </p>
      </div>
    </div>
  );
}
