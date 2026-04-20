import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Small Groups',
  description: 'Find your community at Grace. Join a small group for Bible study, fellowship, and spiritual growth with other members.',
  openGraph: {
    title: 'Small Groups | Grace Community Church',
    description: 'Find your community at Grace. Join a small group for Bible study and fellowship.',
    type: 'website',
  },
};

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
