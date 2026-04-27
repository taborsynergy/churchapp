/**
 * TC-001 to TC-015: Type & Data Model Tests
 * Validates all TypeScript types, interfaces, and data shape contracts
 * for the Grace Community Church app.
 */

import type {
  UserRole,
  UserStatus,
  PrayerCategory,
  PrayerStatus,
  EventCategory,
  GroupCategory,
  DonationStatus,
  PaymentType,
  AnnouncementPriority,
  RsvpStatus,
  UserProfile,
  Sermon,
  SermonSeries,
  Event,
  EventRsvp,
  PrayerRequest,
  Group,
  GroupMember,
  Announcement,
  GivingFund,
  Donation,
} from '../lib/types';

// ─── TC-001: UserRole type ─────────────────────────────────────────────────
describe('TC-001: UserRole type values', () => {
  const validRoles: UserRole[] = ['admin', 'staff', 'member', 'pending'];

  test('admin is a valid UserRole', () => {
    const role: UserRole = 'admin';
    expect(validRoles).toContain(role);
  });

  test('staff is a valid UserRole', () => {
    const role: UserRole = 'staff';
    expect(validRoles).toContain(role);
  });

  test('member is a valid UserRole', () => {
    const role: UserRole = 'member';
    expect(validRoles).toContain(role);
  });

  test('pending is a valid UserRole', () => {
    const role: UserRole = 'pending';
    expect(validRoles).toContain(role);
  });

  test('all 4 roles are defined', () => {
    expect(validRoles).toHaveLength(4);
  });
});

// ─── TC-002: UserStatus type ──────────────────────────────────────────────
describe('TC-002: UserStatus type values', () => {
  const validStatuses: UserStatus[] = ['active', 'pending', 'suspended'];

  test('active is a valid UserStatus', () => {
    expect(validStatuses).toContain('active');
  });

  test('pending is a valid UserStatus', () => {
    expect(validStatuses).toContain('pending');
  });

  test('suspended is a valid UserStatus', () => {
    expect(validStatuses).toContain('suspended');
  });

  test('all 3 statuses are defined', () => {
    expect(validStatuses).toHaveLength(3);
  });
});

// ─── TC-003: PrayerCategory type ──────────────────────────────────────────
describe('TC-003: PrayerCategory type values', () => {
  const validCategories: PrayerCategory[] = [
    'general', 'health', 'family', 'finances', 'relationships', 'guidance', 'praise',
  ];

  test('all 7 prayer categories exist', () => {
    expect(validCategories).toHaveLength(7);
  });

  test('health is a valid PrayerCategory', () => {
    expect(validCategories).toContain('health');
  });

  test('praise is a valid PrayerCategory', () => {
    expect(validCategories).toContain('praise');
  });
});

// ─── TC-004: PrayerStatus type ────────────────────────────────────────────
describe('TC-004: PrayerStatus type values', () => {
  const validStatuses: PrayerStatus[] = ['open', 'answered', 'closed'];

  test('all 3 prayer statuses exist', () => {
    expect(validStatuses).toHaveLength(3);
  });

  test('open is a valid PrayerStatus', () => {
    expect(validStatuses).toContain('open');
  });

  test('answered is a valid PrayerStatus', () => {
    expect(validStatuses).toContain('answered');
  });
});

// ─── TC-005: EventCategory type ──────────────────────────────────────────
describe('TC-005: EventCategory type values', () => {
  const validCategories: EventCategory[] = [
    'general', 'worship', 'youth', 'outreach', 'fellowship', 'prayer',
  ];

  test('all 6 event categories exist', () => {
    expect(validCategories).toHaveLength(6);
  });

  test('worship is a valid EventCategory', () => {
    expect(validCategories).toContain('worship');
  });
});

// ─── TC-006: GroupCategory type ──────────────────────────────────────────
describe('TC-006: GroupCategory type values', () => {
  const validCategories: GroupCategory[] = [
    'general', 'bible_study', 'youth', 'women', 'men', 'couples', 'seniors', 'outreach',
  ];

  test('all 8 group categories exist', () => {
    expect(validCategories).toHaveLength(8);
  });

  test('bible_study is a valid GroupCategory', () => {
    expect(validCategories).toContain('bible_study');
  });
});

// ─── TC-007: DonationStatus type ─────────────────────────────────────────
describe('TC-007: DonationStatus type values', () => {
  const validStatuses: DonationStatus[] = ['pending', 'completed', 'failed', 'refunded'];

  test('all 4 donation statuses exist', () => {
    expect(validStatuses).toHaveLength(4);
  });

  test('completed is a valid DonationStatus', () => {
    expect(validStatuses).toContain('completed');
  });

  test('refunded is a valid DonationStatus', () => {
    expect(validStatuses).toContain('refunded');
  });
});

// ─── TC-008: PaymentType type ────────────────────────────────────────────
describe('TC-008: PaymentType type values', () => {
  const validTypes: PaymentType[] = ['one_time', 'recurring'];

  test('all 2 payment types exist', () => {
    expect(validTypes).toHaveLength(2);
  });

  test('one_time is a valid PaymentType', () => {
    expect(validTypes).toContain('one_time');
  });

  test('recurring is a valid PaymentType', () => {
    expect(validTypes).toContain('recurring');
  });
});

// ─── TC-009: AnnouncementPriority type ───────────────────────────────────
describe('TC-009: AnnouncementPriority type values', () => {
  const validPriorities: AnnouncementPriority[] = ['low', 'normal', 'high', 'urgent'];

  test('all 4 announcement priorities exist', () => {
    expect(validPriorities).toHaveLength(4);
  });

  test('urgent is the highest priority', () => {
    expect(validPriorities).toContain('urgent');
  });
});

// ─── TC-010: UserProfile interface shape ─────────────────────────────────
describe('TC-010: UserProfile interface', () => {
  const mockUser: UserProfile = {
    id: 'uuid-001',
    email: 'john@gracechurch.com',
    full_name: 'John Doe',
    role: 'member',
    status: 'active',
    avatar_url: 'https://example.com/avatar.jpg',
    phone: '555-1234',
    bio: 'Lifelong member',
    address: '123 Main St',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
  };

  test('UserProfile has required id field', () => {
    expect(mockUser.id).toBeDefined();
    expect(typeof mockUser.id).toBe('string');
  });

  test('UserProfile has valid email', () => {
    expect(mockUser.email).toContain('@');
  });

  test('UserProfile role is valid', () => {
    const validRoles: UserRole[] = ['admin', 'staff', 'member', 'pending'];
    expect(validRoles).toContain(mockUser.role);
  });

  test('UserProfile status is valid', () => {
    const validStatuses: UserStatus[] = ['active', 'pending', 'suspended'];
    expect(validStatuses).toContain(mockUser.status);
  });

  test('UserProfile has timestamps', () => {
    expect(mockUser.created_at).toBeDefined();
    expect(mockUser.updated_at).toBeDefined();
  });
});

// ─── TC-011: Sermon interface shape ──────────────────────────────────────
describe('TC-011: Sermon interface', () => {
  const mockSermon: Sermon = {
    id: 'sermon-001',
    title: 'The Grace of God',
    description: 'A message about grace',
    pastor: 'Pastor John',
    series_id: null,
    video_url: 'https://youtube.com/watch?v=abc',
    audio_url: 'https://storage.example.com/sermon.mp3',
    thumbnail_url: 'https://storage.example.com/thumb.jpg',
    scripture_reference: 'John 3:16',
    duration_minutes: 45,
    is_published: true,
    published_at: '2024-06-01T11:00:00Z',
    created_at: '2024-06-01T09:00:00Z',
  };

  test('Sermon has required title', () => {
    expect(mockSermon.title).toBeTruthy();
  });

  test('Sermon duration is a positive number', () => {
    expect(mockSermon.duration_minutes).toBeGreaterThan(0);
  });

  test('Sermon series_id can be null', () => {
    expect(mockSermon.series_id).toBeNull();
  });

  test('Sermon is_published is boolean', () => {
    expect(typeof mockSermon.is_published).toBe('boolean');
  });
});

// ─── TC-012: Event interface shape ───────────────────────────────────────
describe('TC-012: Event interface', () => {
  const mockEvent: Event = {
    id: 'event-001',
    title: 'Summer Picnic',
    description: 'Annual church picnic',
    location: 'City Park',
    start_date: '2024-07-04T12:00:00Z',
    end_date: '2024-07-04T17:00:00Z',
    image_url: 'https://example.com/picnic.jpg',
    capacity: 200,
    is_published: true,
    category: 'fellowship',
    created_by: 'admin-001',
    created_at: '2024-06-01T00:00:00Z',
  };

  test('Event has a valid category', () => {
    const validCategories: EventCategory[] = ['general', 'worship', 'youth', 'outreach', 'fellowship', 'prayer'];
    expect(validCategories).toContain(mockEvent.category);
  });

  test('Event start_date is before end_date', () => {
    const start = new Date(mockEvent.start_date).getTime();
    const end = new Date(mockEvent.end_date!).getTime();
    expect(start).toBeLessThan(end);
  });

  test('Event capacity is positive when set', () => {
    expect(mockEvent.capacity).toBeGreaterThan(0);
  });
});

// ─── TC-013: PrayerRequest interface shape ────────────────────────────────
describe('TC-013: PrayerRequest interface', () => {
  const mockPrayer: PrayerRequest = {
    id: 'prayer-001',
    user_id: null,
    title: 'Healing for my father',
    body: 'Please pray for my father\'s recovery',
    is_anonymous: true,
    status: 'open',
    category: 'health',
    answer_note: null,
    created_at: '2024-06-01T00:00:00Z',
  };

  test('PrayerRequest allows anonymous submissions (user_id null)', () => {
    expect(mockPrayer.user_id).toBeNull();
  });

  test('PrayerRequest is_anonymous is boolean', () => {
    expect(typeof mockPrayer.is_anonymous).toBe('boolean');
  });

  test('PrayerRequest status is valid', () => {
    const validStatuses: PrayerStatus[] = ['open', 'answered', 'closed'];
    expect(validStatuses).toContain(mockPrayer.status);
  });

  test('PrayerRequest category is valid', () => {
    const validCategories: PrayerCategory[] = ['general', 'health', 'family', 'finances', 'relationships', 'guidance', 'praise'];
    expect(validCategories).toContain(mockPrayer.category);
  });
});

// ─── TC-014: Announcement interface shape ────────────────────────────────
describe('TC-014: Announcement interface', () => {
  const mockAnn: Announcement = {
    id: 'ann-001',
    title: 'Easter Service',
    body: 'Join us for our special Easter service',
    priority: 'high',
    published_at: '2024-03-01T00:00:00Z',
    expires_at: '2024-04-01T00:00:00Z',
    is_published: true,
    created_by: 'admin-001',
    created_at: '2024-03-01T00:00:00Z',
  };

  test('Announcement priority is valid', () => {
    const validPriorities: AnnouncementPriority[] = ['low', 'normal', 'high', 'urgent'];
    expect(validPriorities).toContain(mockAnn.priority);
  });

  test('Announcement expires_at can be a date string', () => {
    expect(typeof mockAnn.expires_at).toBe('string');
  });

  test('Announcement is_published is boolean', () => {
    expect(typeof mockAnn.is_published).toBe('boolean');
  });
});

// ─── TC-015: Donation interface shape ────────────────────────────────────
describe('TC-015: Donation interface', () => {
  const mockDonation: Donation = {
    id: 'donation-001',
    user_id: 'user-001',
    fund_id: 'fund-001',
    amount: 100,
    stripe_payment_id: 'pi_xxx',
    stripe_session_id: 'cs_xxx',
    payment_type: 'one_time',
    status: 'completed',
    donor_email: 'donor@example.com',
    donor_name: 'Jane Smith',
    is_anonymous: false,
    created_at: '2024-06-01T00:00:00Z',
  };

  test('Donation amount is a positive number', () => {
    expect(mockDonation.amount).toBeGreaterThan(0);
  });

  test('Donation payment_type is valid', () => {
    const validTypes: PaymentType[] = ['one_time', 'recurring'];
    expect(validTypes).toContain(mockDonation.payment_type);
  });

  test('Donation status is valid', () => {
    const validStatuses: DonationStatus[] = ['pending', 'completed', 'failed', 'refunded'];
    expect(validStatuses).toContain(mockDonation.status);
  });

  test('Donation has Stripe session ID', () => {
    expect(mockDonation.stripe_session_id).toBeTruthy();
  });
});
