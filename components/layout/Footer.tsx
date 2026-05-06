import Link from 'next/link';
import { Church, MapPin, Phone, Mail, Facebook, Youtube, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Church className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-white text-sm tracking-wide">Grace Community</p>
                <p className="text-xs text-teal-400 font-medium">Church</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              A community of faith, hope, and love — rooted in the Gospel, reaching our neighbors, and glorifying God together.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="#" aria-label="Grace Community Church on Facebook" className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-teal-500 hover:text-white transition-all text-slate-400">
                <Facebook className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#" aria-label="Grace Community Church on YouTube" className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-teal-500 hover:text-white transition-all text-slate-400">
                <Youtube className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#" aria-label="Grace Community Church on Instagram" className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-teal-500 hover:text-white transition-all text-slate-400">
                <Instagram className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4 text-xs uppercase tracking-widest">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/sermons', label: 'Sermons' },
                { href: '/events', label: 'Events' },
                { href: '/groups', label: 'Small Groups' },
                { href: '/prayer', label: 'Prayer Requests' },
                { href: '/give', label: 'Give Online' },
                { href: '/announcements', label: 'Announcements' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-teal-400 transition-colors py-1 inline-block">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4 text-xs uppercase tracking-widest">Service Times</h3>
            <ul className="space-y-3">
              {[
                { day: 'Sunday', time: '9:00 AM & 11:00 AM' },
                { day: 'Wednesday', time: '7:00 PM (Bible Study)' },
                { day: 'Friday', time: '6:30 PM (Youth)' },
              ].map((s) => (
                <li key={s.day} className="text-sm">
                  <p className="font-medium text-slate-200">{s.day}</p>
                  <p className="text-slate-400">{s.time}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4 text-xs uppercase tracking-widest">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" aria-hidden="true" />
                <span>123 Grace Avenue<br />Springfield, IL 62701</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Phone className="h-4 w-4 text-teal-500 shrink-0" aria-hidden="true" />
                <a href="tel:+15551234567" className="hover:text-teal-400 transition-colors">(555) 123-4567</a>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Mail className="h-4 w-4 text-teal-500 shrink-0" aria-hidden="true" />
                <a href="mailto:info@gracecommunity.church" className="hover:text-teal-400 transition-colors">info@gracecommunity.church</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/60 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} ChurchConnect. Powered by{' '}
            <a href="https://taborsynergy.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Tabor Synergy</a>
            {' '}| admin@taborsynergy.com
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/pricing" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Terms</Link>
            <Link href="/cookie-policy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Cookies</Link>
            <Link href="/refund-policy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Refunds</Link>
            <Link href="/support" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
