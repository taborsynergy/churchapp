import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join Us',
  description: 'Create your Grace Community Church account to connect with our community, join groups, and grow in faith together.',
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
