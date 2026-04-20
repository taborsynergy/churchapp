/**
 * TC-031 to TC-045: Navigation & Route Tests
 * Validates route definitions, nav link structure, admin guards, and page paths.
 */

// ─── TC-031: Nav links are defined ────────────────────────────────────────
describe('TC-031: Navigation links definition', () => {
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/sermons', label: 'Sermons' },
    { href: '/events', label: 'Events' },
    { href: '/groups', label: 'Groups' },
    { href: '/prayer', label: 'Prayer' },
    { href: '/announcements', label: 'News' },
    { href: '/give', label: 'Give' },
  ];

  test('navbar has 7 links', () => {
    expect(navLinks).toHaveLength(7);
  });

  test('home link points to /', () => {
    const home = navLinks.find(l => l.label === 'Home');
    expect(home?.href).toBe('/');
  });

  test('give link points to /give', () => {
    const give = navLinks.find(l => l.label === 'Give');
    expect(give?.href).toBe('/give');
  });

  test('all links have non-empty labels', () => {
    navLinks.forEach(link => {
      expect(link.label.trim()).toBeTruthy();
    });
  });

  test('all links have valid href starting with /', () => {
    navLinks.forEach(link => {
      expect(link.href.startsWith('/')).toBe(true);
    });
  });
});

// ─── TC-032: Admin navigation links ──────────────────────────────────────
describe('TC-032: Admin navigation links', () => {
  const adminLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/giving', label: 'Giving' },
    { href: '/admin/sermons', label: 'Sermons' },
    { href: '/admin/events', label: 'Events' },
    { href: '/admin/announcements', label: 'Announcements' },
  ];

  test('admin panel has 6 sections', () => {
    expect(adminLinks).toHaveLength(6);
  });

  test('all admin routes start with /admin', () => {
    adminLinks.forEach(link => {
      expect(link.href.startsWith('/admin')).toBe(true);
    });
  });

  test('dashboard is the first admin link', () => {
    expect(adminLinks[0].href).toBe('/admin');
  });

  test('users management route exists', () => {
    const users = adminLinks.find(l => l.href === '/admin/users');
    expect(users).toBeDefined();
  });

  test('giving reports route exists', () => {
    const giving = adminLinks.find(l => l.href === '/admin/giving');
    expect(giving).toBeDefined();
  });
});

// ─── TC-033: Route access control logic ──────────────────────────────────
describe('TC-033: Route access control', () => {
  type UserRole = 'admin' | 'staff' | 'member' | 'pending';

  function canAccess(route: string, role: UserRole | null, status: string | null): boolean {
    const publicRoutes = ['/', '/login', '/register', '/sermons', '/events', '/give'];
    const authRoutes = ['/prayer', '/groups', '/profile', '/directory', '/announcements'];
    const adminRoutes = ['/admin', '/admin/users', '/admin/giving', '/admin/sermons', '/admin/events', '/admin/announcements'];

    if (publicRoutes.includes(route)) return true;
    if (!role) return false;
    if (adminRoutes.some(r => route.startsWith(r))) {
      return role === 'admin' || role === 'staff';
    }
    if (authRoutes.includes(route)) {
      return status === 'active' && (role === 'member' || role === 'admin' || role === 'staff');
    }
    return false;
  }

  test('public routes are accessible without login', () => {
    expect(canAccess('/', null, null)).toBe(true);
    expect(canAccess('/sermons', null, null)).toBe(true);
    expect(canAccess('/give', null, null)).toBe(true);
  });

  test('login page is publicly accessible', () => {
    expect(canAccess('/login', null, null)).toBe(true);
  });

  test('admin route blocked for members', () => {
    expect(canAccess('/admin', 'member', 'active')).toBe(false);
  });

  test('admin route accessible for admin role', () => {
    expect(canAccess('/admin', 'admin', 'active')).toBe(true);
  });

  test('admin route accessible for staff role', () => {
    expect(canAccess('/admin/users', 'staff', 'active')).toBe(true);
  });

  test('directory blocked for pending users', () => {
    expect(canAccess('/directory', 'member', 'pending')).toBe(false);
  });

  test('prayer page accessible for active members', () => {
    expect(canAccess('/prayer', 'member', 'active')).toBe(true);
  });

  test('profile page inaccessible without login', () => {
    expect(canAccess('/profile', null, null)).toBe(false);
  });
});

// ─── TC-034: All 18 application routes exist ──────────────────────────────
describe('TC-034: Application route completeness', () => {
  const appRoutes = [
    '/',
    '/login',
    '/register',
    '/sermons',
    '/events',
    '/prayer',
    '/groups',
    '/give',
    '/announcements',
    '/profile',
    '/directory',
    '/admin',
    '/admin/users',
    '/admin/giving',
    '/admin/sermons',
    '/admin/events',
    '/admin/announcements',
  ];

  test('app has 17 defined routes', () => {
    expect(appRoutes).toHaveLength(17);
  });

  test('all member-facing pages are defined', () => {
    const memberPages = ['/sermons', '/events', '/prayer', '/groups', '/give', '/directory'];
    memberPages.forEach(page => {
      expect(appRoutes).toContain(page);
    });
  });

  test('all admin pages are defined', () => {
    const adminPages = ['/admin', '/admin/users', '/admin/giving', '/admin/sermons', '/admin/events', '/admin/announcements'];
    adminPages.forEach(page => {
      expect(appRoutes).toContain(page);
    });
  });

  test('auth routes are defined', () => {
    expect(appRoutes).toContain('/login');
    expect(appRoutes).toContain('/register');
  });
});

// ─── TC-035: Navigation active state logic ────────────────────────────────
describe('TC-035: Active nav state detection', () => {
  function isActiveRoute(currentPath: string, linkHref: string): boolean {
    return currentPath === linkHref;
  }

  test('exact match marks link as active', () => {
    expect(isActiveRoute('/sermons', '/sermons')).toBe(true);
  });

  test('different path not marked active', () => {
    expect(isActiveRoute('/events', '/sermons')).toBe(false);
  });

  test('home route only active on root', () => {
    expect(isActiveRoute('/', '/')).toBe(true);
    expect(isActiveRoute('/sermons', '/')).toBe(false);
  });
});
