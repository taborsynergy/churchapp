'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LayoutDashboard, Users, DollarSign, BookOpen, Calendar, Megaphone, UsersRound, ClipboardList, Building2, ShieldCheck, Loader as Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPER_ADMIN_EMAIL = 'admin@taborsynergy.com';

const NAV = [
  { href: '/admin',               label: 'Dashboard',    icon: LayoutDashboard, adminOnly: false, superOnly: false },
  { href: '/admin/users',         label: 'Users',        icon: Users,           adminOnly: true,  superOnly: false },
  { href: '/admin/giving',        label: 'Giving',       icon: DollarSign,      adminOnly: false, superOnly: false },
  { href: '/admin/sermons',       label: 'Sermons',      icon: BookOpen,        adminOnly: false, superOnly: false },
  { href: '/admin/events',        label: 'Events',       icon: Calendar,        adminOnly: false, superOnly: false },
  { href: '/admin/groups',        label: 'Groups',       icon: UsersRound,      adminOnly: false, superOnly: false },
  { href: '/admin/attendance',    label: 'Attendance',   icon: ClipboardList,   adminOnly: false, superOnly: false },
  { href: '/admin/announcements', label: 'Announcements',icon: Megaphone,       adminOnly: false, superOnly: false },
  { href: '/admin/churches',      label: 'Churches',     icon: Building2,       adminOnly: true,  superOnly: true  },
  { href: '/admin/licenses',      label: 'Licenses',     icon: ShieldCheck,     adminOnly: true,  superOnly: true  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/admin');
      return;
    }
    if (!profile || !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [user, profile, loading]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-teal-400" /></div>;
  }

  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) return null;

  function visibleNav() {
    return NAV.filter((item) => {
      if (item.superOnly) return isSuperAdmin;
      if (item.adminOnly) return profile?.role === 'admin';
      return true;
    });
  }

  function NavLink({ item, mobile }: { item: typeof NAV[0]; mobile?: boolean }) {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          mobile
            ? 'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0'
            : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5',
          active ? 'bg-teal-500 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        )}
      >
        <item.icon className={mobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {item.label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-56 bg-slate-900 text-slate-200 shrink-0 hidden md:flex flex-col border-r border-slate-800/60">
        <div className="p-5 border-b border-slate-800/60">
          <p className="font-bold text-white text-sm">Admin Panel</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{profile.full_name || profile.email}</p>
        </div>
        <nav className="p-3 flex-1">
          {visibleNav().map((item) => <NavLink key={item.href} item={item} />)}
        </nav>
        <div className="p-3 border-t border-slate-800/60">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300">
            &larr; Back to Site
          </Link>
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        <div className="md:hidden bg-slate-900 text-slate-200 flex gap-1 p-2 overflow-x-auto border-b border-slate-800/60">
          {visibleNav().map((item) => <NavLink key={item.href} item={item} mobile />)}
        </div>
        {children}
      </div>
    </div>
  );
}
