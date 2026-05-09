'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';

export function HeroButtons() {
  const { user } = useAuth();
  return (
    <>
      {user ? (
        <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-xl shadow-teal-500/20 text-base px-8 transition-all hover:shadow-teal-500/30 hover:scale-105" asChild>
          <Link href="/profile">My Profile</Link>
        </Button>
      ) : (
        <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-xl shadow-teal-500/20 text-base px-8 transition-all hover:shadow-teal-500/30 hover:scale-105" asChild>
          <Link href="/register">Join Our Family</Link>
        </Button>
      )}
    </>
  );
}

export function CtaButton() {
  const { user } = useAuth();
  if (user) return null;
  return (
    <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-xl shadow-teal-500/20 hover:shadow-teal-500/30 transition-all hover:scale-105" asChild>
      <Link href="/register">Create Your Account</Link>
    </Button>
  );
}
