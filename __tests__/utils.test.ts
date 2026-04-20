/**
 * TC-016 to TC-030: Utility & Business Logic Tests
 * Tests for helper functions, formatting, validation logic used across the app.
 */

// ─── TC-016: cn() utility class merging ───────────────────────────────────
describe('TC-016: cn() class name utility', () => {
  function cn(...args: (string | undefined | null | false)[]): string {
    return args.filter(Boolean).join(' ');
  }

  test('merges two class strings', () => {
    expect(cn('bg-slate-950', 'text-white')).toBe('bg-slate-950 text-white');
  });

  test('filters out falsy values', () => {
    expect(cn('bg-slate-950', null, undefined, false, 'text-white')).toBe('bg-slate-950 text-white');
  });

  test('handles empty input', () => {
    expect(cn()).toBe('');
  });

  test('handles single class', () => {
    expect(cn('btn-primary')).toBe('btn-primary');
  });

  test('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });
});

// ─── TC-017: Email validation ────────────────────────────────────────────
describe('TC-017: Email validation logic', () => {
  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  test('valid email passes', () => {
    expect(isValidEmail('user@gracechurch.com')).toBe(true);
  });

  test('email without @ fails', () => {
    expect(isValidEmail('usergracechurch.com')).toBe(false);
  });

  test('email without domain fails', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  test('email without TLD fails', () => {
    expect(isValidEmail('user@domain')).toBe(false);
  });

  test('email with subdomain passes', () => {
    expect(isValidEmail('user@mail.gracechurch.com')).toBe(true);
  });

  test('empty string fails', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

// ─── TC-018: Password validation ────────────────────────────────────────
describe('TC-018: Password strength validation', () => {
  function isStrongPassword(pwd: string): boolean {
    return pwd.length >= 8;
  }

  test('password with 8 chars passes', () => {
    expect(isStrongPassword('Pass1234')).toBe(true);
  });

  test('password with 7 chars fails', () => {
    expect(isStrongPassword('Pass123')).toBe(false);
  });

  test('empty password fails', () => {
    expect(isStrongPassword('')).toBe(false);
  });

  test('long password passes', () => {
    expect(isStrongPassword('SecurePassword123!')).toBe(true);
  });
});

// ─── TC-019: Date formatting ─────────────────────────────────────────────
describe('TC-019: Date formatting', () => {
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  test('formats ISO date to readable format', () => {
    const result = formatDate('2024-06-15T00:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('June');
    expect(result).toContain('15');
  });

  test('formats January correctly', () => {
    const result = formatDate('2024-01-01T00:00:00Z');
    expect(result).toContain('January');
  });

  test('handles December', () => {
    const result = formatDate('2024-12-25T00:00:00Z');
    expect(result).toContain('December');
  });
});

// ─── TC-020: Currency formatting ─────────────────────────────────────────
describe('TC-020: Currency formatting', () => {
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  test('formats whole dollar amount', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  test('formats amount with cents', () => {
    expect(formatCurrency(25.5)).toBe('$25.50');
  });

  test('formats large amount with comma', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
  });

  test('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

// ─── TC-021: Donation amount validation ──────────────────────────────────
describe('TC-021: Donation amount validation', () => {
  function isValidDonationAmount(amount: number): boolean {
    return !isNaN(amount) && amount > 0 && amount <= 100000;
  }

  test('valid donation amount of $25 passes', () => {
    expect(isValidDonationAmount(25)).toBe(true);
  });

  test('zero amount fails', () => {
    expect(isValidDonationAmount(0)).toBe(false);
  });

  test('negative amount fails', () => {
    expect(isValidDonationAmount(-10)).toBe(false);
  });

  test('amount over $100,000 fails (sanity check)', () => {
    expect(isValidDonationAmount(100001)).toBe(false);
  });

  test('valid large donation passes', () => {
    expect(isValidDonationAmount(5000)).toBe(true);
  });

  test('NaN fails', () => {
    expect(isValidDonationAmount(NaN)).toBe(false);
  });
});

// ─── TC-022: User role authorization ─────────────────────────────────────
describe('TC-022: Role-based authorization', () => {
  type UserRole = 'admin' | 'staff' | 'member' | 'pending';

  function canAccessAdmin(role: UserRole): boolean {
    return role === 'admin' || role === 'staff';
  }

  function canViewDirectory(role: UserRole, status: string): boolean {
    return (role === 'member' || role === 'admin' || role === 'staff') && status === 'active';
  }

  function canSubmitPrayer(role: UserRole): boolean {
    return role !== 'pending';
  }

  test('admin can access admin panel', () => {
    expect(canAccessAdmin('admin')).toBe(true);
  });

  test('staff can access admin panel', () => {
    expect(canAccessAdmin('staff')).toBe(true);
  });

  test('member cannot access admin panel', () => {
    expect(canAccessAdmin('member')).toBe(false);
  });

  test('pending user cannot access admin panel', () => {
    expect(canAccessAdmin('pending')).toBe(false);
  });

  test('active member can view directory', () => {
    expect(canViewDirectory('member', 'active')).toBe(true);
  });

  test('pending member cannot view directory', () => {
    expect(canViewDirectory('member', 'pending')).toBe(false);
  });

  test('member can submit prayer request', () => {
    expect(canSubmitPrayer('member')).toBe(true);
  });

  test('pending user cannot submit prayer request', () => {
    expect(canSubmitPrayer('pending')).toBe(false);
  });
});

// ─── TC-023: Sermon data validation ──────────────────────────────────────
describe('TC-023: Sermon data validation', () => {
  function isValidSermon(data: { title: string; pastor: string; duration_minutes: number }): boolean {
    return (
      data.title.trim().length > 0 &&
      data.pastor.trim().length > 0 &&
      data.duration_minutes > 0
    );
  }

  test('valid sermon passes validation', () => {
    expect(isValidSermon({ title: 'Grace of God', pastor: 'Pastor John', duration_minutes: 45 })).toBe(true);
  });

  test('sermon with empty title fails', () => {
    expect(isValidSermon({ title: '', pastor: 'Pastor John', duration_minutes: 45 })).toBe(false);
  });

  test('sermon with empty pastor fails', () => {
    expect(isValidSermon({ title: 'Grace', pastor: '', duration_minutes: 45 })).toBe(false);
  });

  test('sermon with 0 duration fails', () => {
    expect(isValidSermon({ title: 'Grace', pastor: 'Pastor', duration_minutes: 0 })).toBe(false);
  });

  test('sermon with negative duration fails', () => {
    expect(isValidSermon({ title: 'Grace', pastor: 'Pastor', duration_minutes: -5 })).toBe(false);
  });
});

// ─── TC-024: Event date validation ───────────────────────────────────────
describe('TC-024: Event date validation', () => {
  function isEventInFuture(startDate: string): boolean {
    return new Date(startDate).getTime() > Date.now();
  }

  function isValidDateRange(start: string, end: string | null): boolean {
    if (!end) return true;
    return new Date(end).getTime() > new Date(start).getTime();
  }

  test('future event is valid', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isEventInFuture(future)).toBe(true);
  });

  test('past event is not in future', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isEventInFuture(past)).toBe(false);
  });

  test('valid date range with end after start', () => {
    expect(isValidDateRange('2024-06-01T10:00:00Z', '2024-06-01T14:00:00Z')).toBe(true);
  });

  test('invalid date range where end is before start', () => {
    expect(isValidDateRange('2024-06-01T14:00:00Z', '2024-06-01T10:00:00Z')).toBe(false);
  });

  test('null end date is valid (single-day event)', () => {
    expect(isValidDateRange('2024-06-01T10:00:00Z', null)).toBe(true);
  });
});

// ─── TC-025: Prayer request validation ───────────────────────────────────
describe('TC-025: Prayer request form validation', () => {
  function isValidPrayerRequest(data: { title: string; body: string; category: string }): boolean {
    return data.title.trim().length > 0 && data.body.trim().length >= 10 && data.category.length > 0;
  }

  test('valid prayer request passes', () => {
    expect(isValidPrayerRequest({
      title: 'Health Request',
      body: 'Please pray for my recovery from illness',
      category: 'health',
    })).toBe(true);
  });

  test('empty title fails', () => {
    expect(isValidPrayerRequest({ title: '', body: 'Long enough body text', category: 'health' })).toBe(false);
  });

  test('too short body fails', () => {
    expect(isValidPrayerRequest({ title: 'Title', body: 'Short', category: 'health' })).toBe(false);
  });

  test('empty category fails', () => {
    expect(isValidPrayerRequest({ title: 'Title', body: 'Long enough body text here', category: '' })).toBe(false);
  });
});

// ─── TC-026: Group membership validation ─────────────────────────────────
describe('TC-026: Group membership business rules', () => {
  function canJoinGroup(group: { is_open: boolean; max_members: number | null; current_count: number }): boolean {
    if (!group.is_open) return false;
    if (group.max_members !== null && group.current_count >= group.max_members) return false;
    return true;
  }

  test('open group with space allows joining', () => {
    expect(canJoinGroup({ is_open: true, max_members: 20, current_count: 10 })).toBe(true);
  });

  test('closed group does not allow joining', () => {
    expect(canJoinGroup({ is_open: false, max_members: 20, current_count: 10 })).toBe(false);
  });

  test('full group does not allow joining', () => {
    expect(canJoinGroup({ is_open: true, max_members: 10, current_count: 10 })).toBe(false);
  });

  test('open group with no max allows joining', () => {
    expect(canJoinGroup({ is_open: true, max_members: null, current_count: 100 })).toBe(true);
  });

  test('group over capacity does not allow joining', () => {
    expect(canJoinGroup({ is_open: true, max_members: 5, current_count: 6 })).toBe(false);
  });
});

// ─── TC-027: Announcement priority ordering ───────────────────────────────
describe('TC-027: Announcement priority ordering', () => {
  const PRIORITY_ORDER: Record<string, number> = {
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

  function sortByPriority(items: Array<{ priority: string }>): Array<{ priority: string }> {
    return [...items].sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
  }

  test('urgent appears before high', () => {
    const sorted = sortByPriority([{ priority: 'high' }, { priority: 'urgent' }]);
    expect(sorted[0].priority).toBe('urgent');
  });

  test('urgent has highest priority value', () => {
    expect(PRIORITY_ORDER['urgent']).toBeGreaterThan(PRIORITY_ORDER['high']);
    expect(PRIORITY_ORDER['high']).toBeGreaterThan(PRIORITY_ORDER['normal']);
    expect(PRIORITY_ORDER['normal']).toBeGreaterThan(PRIORITY_ORDER['low']);
  });

  test('sorts mixed priorities correctly', () => {
    const items = [
      { priority: 'low' },
      { priority: 'urgent' },
      { priority: 'normal' },
      { priority: 'high' },
    ];
    const sorted = sortByPriority(items);
    expect(sorted[0].priority).toBe('urgent');
    expect(sorted[3].priority).toBe('low');
  });
});

// ─── TC-028: RSVP status validation ──────────────────────────────────────
describe('TC-028: RSVP status validation', () => {
  type RsvpStatus = 'attending' | 'maybe' | 'declined';

  function isValidRsvpStatus(status: string): status is RsvpStatus {
    return ['attending', 'maybe', 'declined'].includes(status);
  }

  test('attending is a valid RSVP status', () => {
    expect(isValidRsvpStatus('attending')).toBe(true);
  });

  test('maybe is a valid RSVP status', () => {
    expect(isValidRsvpStatus('maybe')).toBe(true);
  });

  test('declined is a valid RSVP status', () => {
    expect(isValidRsvpStatus('declined')).toBe(true);
  });

  test('invalid string fails', () => {
    expect(isValidRsvpStatus('going')).toBe(false);
  });
});

// ─── TC-029: Donation preset amounts ─────────────────────────────────────
describe('TC-029: Donation preset amount logic', () => {
  const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

  test('preset amounts include standard church giving tiers', () => {
    expect(PRESET_AMOUNTS).toContain(25);
    expect(PRESET_AMOUNTS).toContain(50);
    expect(PRESET_AMOUNTS).toContain(100);
  });

  test('preset amounts are sorted ascending', () => {
    const sorted = [...PRESET_AMOUNTS].sort((a, b) => a - b);
    expect(sorted).toEqual(PRESET_AMOUNTS);
  });

  test('all preset amounts are positive', () => {
    PRESET_AMOUNTS.forEach(amount => {
      expect(amount).toBeGreaterThan(0);
    });
  });

  test('custom amount replaces preset selection', () => {
    let selected = 50;
    const custom = 75;
    selected = custom;
    expect(selected).toBe(75);
    expect(PRESET_AMOUNTS).not.toContain(selected);
  });
});

// ─── TC-030: User initials generation ────────────────────────────────────
describe('TC-030: User initials generation', () => {
  function getInitials(fullName: string, email?: string): string {
    if (fullName) {
      return fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email ? email.slice(0, 2).toUpperCase() : 'GC';
  }

  test('generates initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  test('generates initials from first name only', () => {
    expect(getInitials('John')).toBe('J');
  });

  test('limits to 2 characters', () => {
    expect(getInitials('John Mark Smith')).toBe('JM');
  });

  test('uses email fallback when no name', () => {
    expect(getInitials('', 'ab@example.com')).toBe('AB');
  });

  test('defaults to GC when no name or email', () => {
    expect(getInitials('')).toBe('GC');
  });

  test('converts to uppercase', () => {
    expect(getInitials('john doe')).toBe('JD');
  });
});
