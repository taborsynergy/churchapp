import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Give Online',
  description: 'Support Grace Community Church through your generous giving. Donate to the General Fund, Building Fund, Missions, and more.',
  openGraph: {
    title: 'Give Online | Grace Community Church',
    description: 'Support Grace Community Church through your generous giving.',
    type: 'website',
  },
};

export default function GiveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
