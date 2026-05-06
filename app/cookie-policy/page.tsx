import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | ChurchConnect by Tabor Synergy',
  description: 'How ChurchConnect uses cookies and similar technologies.',
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-20 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert prose-slate">
        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: 30 April 2026 | ChurchConnect by Tabor Synergy</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">1. What Are Cookies</h2>
          <p className="text-slate-300">
            Cookies are small text files placed on your device when you visit ChurchConnect
            (app.taborsynergy.com). They help us keep you logged in, remember your preferences, and
            understand how you use the app so we can improve it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">2. Cookies We Use</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 pr-4 text-white">Cookie</th>
                  <th className="text-left py-2 pr-4 text-white">Purpose</th>
                  <th className="text-left py-2 text-white">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  ['sb-*-auth-token', 'Supabase authentication session — keeps you logged in', '7 days'],
                  ['__Host-next-auth.*', 'NextAuth session security token', 'Session'],
                  ['sentry-sc', 'Sentry error tracking session (anonymous)', '1 year'],
                ].map(([name, purpose, duration]) => (
                  <tr key={name}>
                    <td className="py-2 pr-4 font-mono text-teal-300">{name}</td>
                    <td className="py-2 pr-4">{purpose}</td>
                    <td className="py-2">{duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">3. Essential Cookies Only</h2>
          <p className="text-slate-300">
            ChurchConnect uses only essential cookies required for the app to function. We do not use
            advertising, tracking, or analytics cookies. We do not share cookie data with third parties
            for marketing purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">4. Managing Cookies</h2>
          <p className="text-slate-300">
            You can clear cookies at any time through your browser settings. Disabling the
            authentication cookie will log you out of ChurchConnect. Most browsers allow you to block
            third-party cookies without affecting essential site functionality.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Contact</h2>
          <p className="text-slate-300">
            For cookie-related questions, contact us at{' '}
            <a href="mailto:admin@taborsynergy.com" className="text-teal-400 underline">
              admin@taborsynergy.com
            </a>{' '}
            or visit{' '}
            <a href="https://taborsynergy.com" className="text-teal-400 underline">
              taborsynergy.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
