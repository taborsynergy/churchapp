'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Church, Menu, ChevronDown, LogOut, User, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/sermons', label: 'Sermons' },
  { href: '/events', label: 'Events' },
  { href: '/groups', label: 'Groups' },
  { href: '/prayer', label: 'Prayer' },
  { href: '/announcements', label: 'News' },
  { href: '/give', label: 'Give' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'GC';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-700/50 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-all">
              <Church className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-white text-sm leading-tight tracking-wide">Grace Community</p>
              <p className="text-xs text-teal-400 leading-tight font-medium">Church</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  pathname === link.href
                    ? 'text-teal-400 bg-teal-500/10 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Open account menu" className="flex items-center gap-2 rounded-xl hover:bg-slate-800 px-2 py-1.5 transition-all outline-none border border-transparent hover:border-slate-700/50">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name} />
                      <AvatarFallback className="bg-teal-500/20 text-teal-400 text-xs font-semibold border border-teal-500/20">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium text-slate-200 max-w-[120px] truncate">
                      {profile?.full_name || 'My Account'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500 hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-700 text-slate-200">
                  <DropdownMenuItem asChild className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                      <Link href="/admin" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-slate-400" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-700/50" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-400 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-md shadow-teal-500/20" asChild>
                  <Link href="/register">Join Us</Link>
                </Button>
              </div>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="lg:hidden text-slate-300 hover:text-white hover:bg-slate-800">
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 pt-10 bg-slate-950 border-slate-700">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'px-4 py-3 text-base font-medium rounded-xl transition-all',
                        pathname === link.href
                          ? 'text-teal-400 bg-teal-500/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t border-slate-700/50 mt-3 pt-3">
                    {user ? (
                      <>
                        <Link
                          href="/profile"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-teal-500/20 text-teal-400 text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          My Profile
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
                          >
                            <LayoutDashboard className="h-5 w-5 text-slate-500" />
                            Admin Dashboard
                          </Link>
                        )}
                        <button
                          onClick={() => { handleSignOut(); setMobileOpen(false); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-base font-medium rounded-xl text-red-400 hover:bg-red-500/10"
                        >
                          <LogOut className="h-5 w-5" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 px-4">
                        <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" asChild onClick={() => setMobileOpen(false)}>
                          <Link href="/login">Sign In</Link>
                        </Button>
                        <Button className="bg-teal-500 hover:bg-teal-400 text-white font-semibold" asChild onClick={() => setMobileOpen(false)}>
                          <Link href="/register">Join Us</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
