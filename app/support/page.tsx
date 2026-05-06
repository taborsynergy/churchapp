import type { Metadata } from 'next';
import { Mail, MessageCircle, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Support | ChurchConnect by Tabor Synergy',
  description: 'Get help with ChurchConnect. Contact Tabor Synergy support.',
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
          <p className="text-slate-400 text-lg">
            ChurchConnect is built and supported by Tabor Synergy. We&apos;re here for you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
            <Mail className="h-8 w-8 text-teal-400 mb-4" />
            <h2 className="text-lg font-bold mb-2">Email Support</h2>
            <p className="text-slate-400 text-sm mb-4">
              Send us an email and we&apos;ll respond within 24 hours on business days.
            </p>
            <Button asChild className="bg-teal-500 hover:bg-teal-400 text-white w-full font-semibold">
              <a href="mailto:admin@taborsynergy.com">admin@taborsynergy.com</a>
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
            <MessageCircle className="h-8 w-8 text-green-400 mb-4" />
            <h2 className="text-lg font-bold mb-2">WhatsApp Support</h2>
            <p className="text-slate-400 text-sm mb-4">
              Chat with our support team directly on WhatsApp for faster responses.
            </p>
            <Button asChild className="bg-green-600 hover:bg-green-500 text-white w-full font-semibold">
              <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer">
                Chat on WhatsApp
              </a>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8 mb-8">
          <Clock className="h-8 w-8 text-teal-400 mb-4" />
          <h2 className="text-lg font-bold mb-2">Support Hours</h2>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>Monday – Friday: 9:00 AM – 6:00 PM IST</li>
            <li>Saturday: 10:00 AM – 2:00 PM IST</li>
            <li>Sunday & Public Holidays: Emergency email only</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
          <BookOpen className="h-8 w-8 text-teal-400 mb-4" />
          <h2 className="text-lg font-bold mb-3">Frequently Asked Questions</h2>
          <div className="space-y-5 text-sm">
            {[
              ['How do I add a new sermon?', 'Go to Admin → Sermons → Upload Sermon. You can upload video or audio files up to 500 MB.'],
              ['How do I invite church members?', 'Go to Admin → Users → Create User. Members will receive a welcome email with login instructions.'],
              ['What happens after my trial ends?', 'You will be redirected to our pricing page to choose a plan. Your data is preserved for 30 days.'],
              ['Can I change my plan later?', 'Yes. Contact admin@taborsynergy.com and we will upgrade or downgrade your plan immediately.'],
              ['How are donations processed?', 'INR donations use Razorpay; USD donations use Stripe. Both are PCI-compliant and no card data touches our servers.'],
            ].map(([q, a]) => (
              <div key={q}>
                <p className="font-semibold text-white mb-1">{q}</p>
                <p className="text-slate-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
