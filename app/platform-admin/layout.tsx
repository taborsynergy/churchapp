import './../../app/globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata = {
  title: 'Platform Admin — ChurchConnect',
};

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
