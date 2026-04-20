import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms of Use for Grace Community Church — rules and guidelines for using our website and services.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-white mb-3">Terms of Use</h1>
        <p className="text-slate-400 mb-10">Last updated: January 1, 2025</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">By accessing and using the Grace Community Church website and member portal, you agree to these Terms of Use. If you do not agree, please discontinue use of our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Eligibility</h2>
            <p className="leading-relaxed">You must be at least 13 years of age to create an account. By creating an account, you represent that you meet this age requirement and that all information you provide is accurate.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Account Responsibilities</h2>
            <p className="leading-relaxed">You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately if you suspect unauthorized access to your account. Grace Community Church is not liable for any loss resulting from unauthorized use of your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Acceptable Use</h2>
            <p className="leading-relaxed mb-2">You agree not to use our platform to:</p>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>Post false, misleading, or harmful content</li>
              <li>Harass, threaten, or abuse other members</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the platform for commercial purposes without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Prayer Requests & Community Content</h2>
            <p className="leading-relaxed">Content submitted to our prayer request board and community features is subject to moderation. We reserve the right to remove content that violates our community guidelines or is deemed inappropriate. Please treat all shared personal information with respect and confidentiality.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Donations</h2>
            <p className="leading-relaxed">All donations made through our platform are voluntary gifts to Grace Community Church, a registered non-profit organization. Donations are generally non-refundable except at the discretion of church leadership. Please contact us if you believe a donation was made in error.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Intellectual Property</h2>
            <p className="leading-relaxed">All sermon content, logos, and original materials on this site are the property of Grace Community Church. Sermon content may be shared for personal and non-commercial ministry use with proper attribution.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Disclaimer of Warranties</h2>
            <p className="leading-relaxed">This website is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted or error-free service and are not liable for any damages arising from your use of the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Changes to Terms</h2>
            <p className="leading-relaxed">We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. We will notify registered users of significant changes via email.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Contact</h2>
            <p className="leading-relaxed">For questions about these Terms, contact us at:</p>
            <address className="not-italic mt-2 text-slate-400">
              Grace Community Church<br />
              123 Grace Avenue, Springfield, IL 62701<br />
              <a href="mailto:info@gracecommunity.church" className="text-teal-400 hover:text-teal-300">info@gracecommunity.church</a>
            </address>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <Link href="/" className="text-teal-400 hover:text-teal-300 text-sm font-medium">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
