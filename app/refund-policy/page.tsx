import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy | ChurchConnect by Tabor Synergy',
  description: 'Refund and cancellation policy for ChurchConnect plans.',
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Refund Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: 30 April 2026 | ChurchConnect by Tabor Synergy</p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Free Trial</h2>
            <p>
              All plans include a 14-day free trial. No credit card is required to start a trial.
              You will not be charged unless you actively choose to subscribe after the trial period ends.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Monthly Subscriptions</h2>
            <p className="mb-2">
              Monthly subscriptions are billed at the start of each billing cycle. You may cancel at
              any time; cancellation takes effect at the end of the current paid period. We do not
              provide partial-month refunds for monthly subscriptions.
            </p>
            <p>
              <strong className="text-white">Exception:</strong> If you experience a verified technical
              failure on our side that renders ChurchConnect completely unusable for more than 48
              continuous hours, you are eligible for a prorated credit for the affected days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. One-Time Licences</h2>
            <p className="mb-2">
              One-time licence payments are refundable within <strong className="text-white">7 days</strong> of
              purchase, provided you have not exceeded 50 active member accounts or uploaded more than
              10 sermons/events under the licence.
            </p>
            <p>
              After the 7-day window, one-time licences are non-refundable. We strongly recommend
              using the free trial before purchasing a one-time licence.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Donations</h2>
            <p>
              Donations made through ChurchConnect are processed directly to the receiving church.
              Tabor Synergy is not the merchant of record for church donations and cannot issue refunds
              on a church&apos;s behalf. Please contact the respective church admin for donation-related
              refund requests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. How to Request a Refund</h2>
            <p>
              Email{' '}
              <a href="mailto:admin@taborsynergy.com" className="text-teal-400 underline">
                admin@taborsynergy.com
              </a>{' '}
              with the subject line <em>"Refund Request — [Your Church Name]"</em>, your order/invoice
              number, and the reason for the refund. We will respond within 2 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Currency & Payment Processors</h2>
            <p>
              INR payments are processed via Razorpay. USD payments are processed via Stripe. Refunds
              are credited to the original payment method and may take 5–10 business days to appear
              depending on your bank.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
