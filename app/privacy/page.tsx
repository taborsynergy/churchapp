import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Grace Community Church — how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
        <p className="text-slate-400 mb-10">Last updated: January 1, 2025</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
            <p className="leading-relaxed">We collect information you provide directly to us when you create an account, fill out a form, submit a prayer request, or make a donation. This may include your name, email address, phone number, and mailing address.</p>
            <p className="mt-3 leading-relaxed">We also collect limited usage data to improve our services, such as pages visited and features used. We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>To operate and maintain your church account</li>
              <li>To send church-related communications and announcements</li>
              <li>To process donations securely through our payment processor (Stripe)</li>
              <li>To facilitate small group connections and event registrations</li>
              <li>To respond to your requests, comments, and questions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Payment Information</h2>
            <p className="leading-relaxed">All donations are processed through Stripe, a PCI-DSS compliant payment processor. Grace Community Church never stores your full card number, CVV, or other sensitive payment details on our servers. Stripe&apos;s privacy policy governs the handling of your payment information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Prayer Requests</h2>
            <p className="leading-relaxed">Prayer requests submitted as anonymous are visible to the church community without your name. However, your identity is internally linked to the request for administrative purposes. Non-anonymous requests display your name to other authenticated members. Sensitive prayer requests should be submitted as anonymous if you prefer privacy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Retention</h2>
            <p className="leading-relaxed">We retain your account information for as long as your account is active. You may request deletion of your account and associated data by contacting us at <a href="mailto:info@gracecommunity.church" className="text-teal-400 hover:text-teal-300">info@gracecommunity.church</a>. Donation records may be retained for legal and tax compliance purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Your Rights</h2>
            <p className="leading-relaxed">You have the right to access, correct, or delete your personal data. To exercise these rights, please contact us. Residents of the EU/EEA have additional rights under GDPR, including the right to data portability and the right to restrict processing.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Cookies</h2>
            <p className="leading-relaxed">We use session cookies necessary for authentication and site functionality. We do not use advertising or tracking cookies. By using this site, you consent to our use of essential cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Children&apos;s Privacy</h2>
            <p className="leading-relaxed">Our online services are not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Contact Us</h2>
            <p className="leading-relaxed">For privacy-related questions, please contact:</p>
            <address className="not-italic mt-2 text-slate-400">
              Grace Community Church<br />
              123 Grace Avenue<br />
              Springfield, IL 62701<br />
              <a href="mailto:info@gracecommunity.church" className="text-teal-400 hover:text-teal-300">info@gracecommunity.church</a><br />
              (555) 123-4567
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
