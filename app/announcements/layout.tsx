import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Announcements',
  description: 'Stay up to date with the latest news and announcements from Grace Community Church.',
  openGraph: {
    title: 'Announcements | Grace Community Church',
    description: 'Stay up to date with the latest news and announcements from Grace Community Church.',
    type: 'website',
  },
};

export default function AnnouncementsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
