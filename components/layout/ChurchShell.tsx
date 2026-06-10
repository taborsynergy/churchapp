'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import { TrialBanner } from '@/components/ui/trial-banner';

export default function ChurchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlatformAdmin = pathname?.startsWith('/platform-admin');

  if (isPlatformAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <TrialBanner />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
      </div>
    </>
  );
}
