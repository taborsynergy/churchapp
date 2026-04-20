import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sermons',
  description: 'Watch and listen to sermons from Grace Community Church. Grow in your faith through biblical teaching on demand.',
  openGraph: {
    title: 'Sermons | Grace Community Church',
    description: 'Watch and listen to sermons from Grace Community Church. Grow in your faith through biblical teaching on demand.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sermons | Grace Community Church',
    description: 'Watch and listen to sermons from Grace Community Church.',
  },
};

export default function SermonsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
