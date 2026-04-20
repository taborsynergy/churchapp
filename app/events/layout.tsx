import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Stay connected with upcoming events at Grace Community Church — worship services, community outreach, small groups, and more.',
  openGraph: {
    title: 'Events | Grace Community Church',
    description: 'Stay connected with upcoming events at Grace Community Church.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Events | Grace Community Church',
    description: 'Stay connected with upcoming events at Grace Community Church.',
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
