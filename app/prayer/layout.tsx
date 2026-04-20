import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prayer Requests',
  description: 'Submit and pray for requests from our Grace Community family. We believe in the power of prayer.',
  openGraph: {
    title: 'Prayer Requests | Grace Community Church',
    description: 'Submit and pray for requests from our Grace Community family.',
    type: 'website',
  },
};

export default function PrayerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
