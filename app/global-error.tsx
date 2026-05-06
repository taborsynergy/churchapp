'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4 text-center">
        <p className="text-5xl font-bold text-red-400 mb-3">500</p>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-slate-400 mb-6 max-w-md">
          An unexpected error occurred. Contact{' '}
          <a href="mailto:admin@taborsynergy.com" className="text-teal-400 underline">
            admin@taborsynergy.com
          </a>
        </p>
        <Button onClick={reset} className="bg-teal-500 hover:bg-teal-400 text-white font-semibold">
          Try again
        </Button>
      </body>
    </html>
  );
}
