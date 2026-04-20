'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TriangleAlert as AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center bg-slate-950">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-slate-400 mb-6 max-w-md">
        We encountered an unexpected error. This has been logged and we&apos;ll look into it.
      </p>
      <Button
        onClick={reset}
        className="bg-teal-500 hover:bg-teal-400 text-white font-semibold"
      >
        Try again
      </Button>
    </div>
  );
}
