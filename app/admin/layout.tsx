'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LayoutDashboard, Users, DollarSign, BookOpen, Calendar, Megaphone, UsersRound, ClipboardList, Loader as Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/giving', label: 'Giving', icon: DollarSign },
  { href: '/admin/sermons', label: 'Sermons', icon: BookOpen },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/groups', label: 'Groups', icon: UsersRound },
  { href: '/admin/attendance', label: 'Attendance', icon: ClipboardList },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/admin');
      return;
    }
    // profile loaded but not admin/staff (includes null profile = no church_users row)
    if (!profile || !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [user, profile, loading]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div>;
  }

  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-56 bg-slate-900 text-slate-200 shrink-0 hidden md:flex flex-col border-r border-slate-800/60">
        <div className="p-5 border-b border-slate-800/60">
          <p className="font-bold text-white text-sm">Admin Panel</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{profile.full_name || profile.email}</p>
        </div>
        <nav className="p-3 flex-1">
          {NAV.filter((item) => item.href !== '/admin/users' || profile?.role === 'admin').map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5',
                pathname === item.href ? 'bg-teal-500 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800/60">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300">
            &larr; Back to Site
          </Link>
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        <div className="md:hidden bg-slate-900 text-slate-200 flex gap-1 p-2 overflow-x-auto border-b border-slate-800/60">
          {NAV.filter((item) => item.href !== '/admin/users' || profile?.role === 'admin').map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                pathname === item.href ? 'bg-teal-500 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
