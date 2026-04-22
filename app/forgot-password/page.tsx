'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Church, Loader as Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center mx-auto mb-4">
            <Church className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Grace Community Church</h1>
          <p className="text-slate-400 mt-1">Reset your password</p>
        </div>

        <Card className="border-slate-700/50 bg-slate-900 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-white">Forgot Password</CardTitle>
            <CardDescription className="text-slate-400">
              {sent ? 'Check your email for a reset link.' : "Enter your email and we'll send you a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-teal-400" />
                </div>
                <p className="text-slate-300 text-sm">
                  A password reset link has been sent to <span className="text-white font-medium">{email}</span>. Check your inbox and spam folder.
                </p>
                <Link href="/login" className="block text-teal-400 hover:text-teal-300 text-sm font-medium">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-teal-500"
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <div className="text-center">
                  <Link href="/login" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300">
                    <ArrowLeft className="h-3.5 w-3.5" />Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
