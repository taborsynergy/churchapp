import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Church } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center bg-slate-950">
      <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-5">
        <Church className="h-8 w-8 text-teal-400" />
      </div>
      <p className="text-6xl font-bold text-teal-400 mb-2">404</p>
      <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-slate-400 mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild className="bg-teal-500 hover:bg-teal-400 text-white font-semibold">
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
