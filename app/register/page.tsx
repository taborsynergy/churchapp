'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Church, Loader as Loader2, Eye, EyeOff, CircleCheck as CheckCircle } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function RegisterPage() {
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast({ title: 'Google sign-in failed', description: error.message, variant: 'destructive' });
      setGoogleLoading(false);
    }
    // On success the browser navigates away — no need to reset loading
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: 'Name required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast({ title: 'Password too weak', description: 'Password must contain at least one uppercase letter and one number.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        // Redirect to callback so email confirmation also creates the church_users record
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase().includes('already registered')
        ? 'An account with this email already exists.'
        : error.message;
      toast({ title: 'Registration failed', description: msg, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // identities is empty when the email is already taken (Supabase hides this to prevent enumeration)
    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      toast({ title: 'Email already registered', description: 'An account with this email already exists. Try signing in instead.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Only create church_users if Supabase gave us a confirmed session (email confirmation disabled).
    // If session is null, email confirmation is required — church_users will be created by /auth/callback.
    if (data.session) {
      await supabase.from('church_users').insert({
        id: data.user.id,
        email,
        full_name: fullName.trim(),
        role: 'pending',
        status: 'pending',
      });
    }

    setSuccessEmail(email);
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Grace!</h2>
          <p className="text-slate-400 mb-2">
            Your account has been submitted and is pending admin approval.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            We also sent a confirmation link to <span className="text-slate-300 font-medium">{successEmail}</span>. Please click it to verify your email address.
          </p>
          <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold" asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center mx-auto mb-4">
            <Church className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Grace Community Church</h1>
          <p className="text-slate-400 mt-1">Create your member account</p>
        </div>

        <Card className="border-slate-700/50 bg-slate-900 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-white">Join Our Community</CardTitle>
            <CardDescription className="text-slate-400">Register to access all member features</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-5 bg-teal-500/10 border-teal-500/20">
              <AlertDescription className="text-teal-400 text-sm">
                New accounts require admin approval before activation. You&apos;ll be notified when your account is ready.
              </AlertDescription>
            </Alert>

            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-700 text-slate-200 hover:bg-slate-800 bg-slate-800/50 mb-4 flex items-center gap-3"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-2 text-slate-500">or register with email</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-slate-300">Full Name <span className="text-red-400" aria-hidden="true">*</span></Label>
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">Email Address <span className="text-red-400" aria-hidden="true">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300">Password <span className="text-red-400" aria-hidden="true">*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-teal-500 pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Creating Account…' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="text-teal-400 hover:text-teal-300 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
