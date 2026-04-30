/**
 * Database Integration Tests
 *
 * Covers:
 *  - Environment / connectivity
 *  - Public read access (anon key) for publicly-visible tables
 *  - Seed data presence
 *  - RLS blocks unauthenticated writes
 *  - Column constraint enforcement (via service role when available)
 *  - Foreign key integrity
 *  - Join queries
 *  - Full CRUD round-trips (service role)
 *  - Ordering & pagination
 *  - Schema shape validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ANON_KEY;

// Database integration tests only run when a dedicated test DB is configured
// (TEST_DB=true in the environment), to avoid hitting the development database
// with write operations and seed-data assertions.
const hasCredentials = Boolean(URL && ANON_KEY);
const isTestDbEnabled = Boolean(process.env.TEST_DB === 'true' && hasCredentials);

// Conditionally skip all database describe blocks when not in test-DB mode.
const dbDescribe = isTestDbEnabled ? describe : describe.skip;

// Use placeholder URLs when env vars are absent so createClient doesn't throw
// at import time. All tests that need real connectivity are guarded by hasCredentials.
const safeUrl = URL || 'https://placeholder.supabase.co';
const safeAnonKey = ANON_KEY || 'placeholder-anon-key';
const safeServiceKey = SERVICE_KEY || safeAnonKey;

const anon: SupabaseClient = createClient(safeUrl, safeAnonKey);
const service: SupabaseClient = createClient(safeUrl, safeServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hasServiceKey = SERVICE_KEY !== ANON_KEY;

const EXPECTED_TABLES = [
  'users',
  'sermon_series',
  'sermons',
  'events',
  'event_rsvps',
  'prayer_requests',
  'groups',
  'group_members',
  'announcements',
  'giving_funds',
  'donations',
];

// ─── TC-DB-001: Environment ───────────────────────────────────────────────────
dbDescribe('TC-DB-001: Environment configuration', () => {
  test('NEXT_PUBLIC_SUPABASE_URL is set and valid', () => {
    expect(URL).toBeTruthy();
    expect(URL).toMatch(/^https?:\/\//);
  });

  test('NEXT_PUBLIC_SUPABASE_ANON_KEY is set', () => {
    expect(ANON_KEY).toBeTruthy();
    expect(ANON_KEY.length).toBeGreaterThan(20);
  });
});

// ─── TC-DB-002: Database is reachable ────────────────────────────────────────
dbDescribe('TC-DB-002: Database connectivity', () => {
  test('can connect and query giving_funds', async () => {
    const { error } = await anon.from('giving_funds').select('id').limit(1);
    expect(error).toBeNull();
  });

  test('can connect and query sermon_series', async () => {
    const { error } = await anon.from('sermon_series').select('id').limit(1);
    expect(error).toBeNull();
  });

  test('can connect and query announcements', async () => {
    const { error } = await anon
      .from('announcements')
      .select('id')
      .eq('is_published', true)
      .limit(1);
    expect(error).toBeNull();
  });
});

// ─── TC-DB-003: Public read — sermon_series ───────────────────────────────────
dbDescribe('TC-DB-003: sermon_series — public read access', () => {
  test('anon can read sermon_series', async () => {
    const { data, error } = await anon.from('sermon_series').select('id, title, is_active');
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('at least 2 active series exist (seed data)', async () => {
    const { data } = await anon
      .from('sermon_series')
      .select('id')
      .eq('is_active', true);
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  test('all returned series have non-empty titles', async () => {
    const { data } = await anon.from('sermon_series').select('title');
    (data ?? []).forEach((r: any) => {
      expect(typeof r.title).toBe('string');
      expect(r.title.trim().length).toBeGreaterThan(0);
    });
  });

  test('is_active field is a boolean', async () => {
    const { data } = await anon.from('sermon_series').select('is_active').limit(5);
    (data ?? []).forEach((r: any) => {
      expect(typeof r.is_active).toBe('boolean');
    });
  });
});

// ─── TC-DB-004: Public read — announcements ───────────────────────────────────
dbDescribe('TC-DB-004: announcements — public read access', () => {
  test('anon can read published announcements', async () => {
    const { data, error } = await anon
      .from('announcements')
      .select('id, title, priority, is_published')
      .eq('is_published', true);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('at least 3 announcements from seed data', async () => {
    const { data } = await anon
      .from('announcements')
      .select('id')
      .eq('is_published', true);
    expect((data ?? []).length).toBeGreaterThanOrEqual(3);
  });

  test('all returned announcements are published', async () => {
    const { data } = await anon
      .from('announcements')
      .select('is_published')
      .eq('is_published', true);
    (data ?? []).forEach((r: any) => {
      expect(r.is_published).toBe(true);
    });
  });

  test('priority values are within valid enum', async () => {
    const valid = new Set(['low', 'normal', 'high', 'urgent']);
    const { data } = await anon.from('announcements').select('priority');
    (data ?? []).forEach((r: any) => {
      expect(valid.has(r.priority)).toBe(true);
    });
  });

  test('announcements can be ordered by published_at descending', async () => {
    const { data, error } = await anon
      .from('announcements')
      .select('id, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(10);
    expect(error).toBeNull();
    if ((data ?? []).length > 1) {
      const dates = data!.map((r) => new Date(r.published_at).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    }
  });
});

// ─── TC-DB-005: Public read — giving_funds ────────────────────────────────────
dbDescribe('TC-DB-005: giving_funds — public read & seed data', () => {
  test('anon can read active giving funds', async () => {
    const { data, error } = await anon
      .from('giving_funds')
      .select('id, name, is_active')
      .eq('is_active', true);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('at least 4 active funds exist', async () => {
    const { data } = await anon.from('giving_funds').select('id').eq('is_active', true);
    expect((data ?? []).length).toBeGreaterThanOrEqual(4);
  });

  test('General Fund exists', async () => {
    const { data } = await anon
      .from('giving_funds')
      .select('name')
      .eq('name', 'General Fund')
      .maybeSingle();
    expect(data).not.toBeNull();
  });

  test('Building Fund exists with a goal_amount > 0', async () => {
    const { data } = await anon
      .from('giving_funds')
      .select('name, goal_amount')
      .eq('name', 'Building Fund')
      .maybeSingle();
    expect(data).not.toBeNull();
    expect(Number(data?.goal_amount)).toBeGreaterThan(0);
  });

  test('Missions Fund exists', async () => {
    const { data } = await anon
      .from('giving_funds')
      .select('name')
      .eq('name', 'Missions Fund')
      .maybeSingle();
    expect(data).not.toBeNull();
  });

  test('Youth Ministry fund exists', async () => {
    const { data } = await anon
      .from('giving_funds')
      .select('name')
      .eq('name', 'Youth Ministry')
      .maybeSingle();
    expect(data).not.toBeNull();
  });

  test('is_active field is boolean on all returned funds', async () => {
    const { data } = await anon.from('giving_funds').select('is_active').limit(10);
    (data ?? []).forEach((r: any) => {
      expect(typeof r.is_active).toBe('boolean');
    });
  });
});

// ─── TC-DB-006: Public read — sermons ────────────────────────────────────────
dbDescribe('TC-DB-006: sermons — public read (published only)', () => {
  test('anon can query sermons', async () => {
    const { data, error } = await anon
      .from('sermons')
      .select('id, title, is_published')
      .eq('is_published', true);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('anon only sees is_published = true rows', async () => {
    const { data } = await anon.from('sermons').select('is_published');
    (data ?? []).forEach((r: any) => {
      expect(r.is_published).toBe(true);
    });
  });

  test('sermons can be joined with sermon_series', async () => {
    const { data, error } = await anon
      .from('sermons')
      .select('id, title, sermon_series(id, title)')
      .eq('is_published', true)
      .limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─── TC-DB-007: Public read — events ─────────────────────────────────────────
dbDescribe('TC-DB-007: events — public read', () => {
  test('anon can query published events', async () => {
    const { data, error } = await anon
      .from('events')
      .select('id, title, is_published, category')
      .eq('is_published', true);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('event category values are within valid enum', async () => {
    const valid = new Set(['general', 'worship', 'youth', 'outreach', 'fellowship', 'prayer']);
    const { data } = await anon
      .from('events')
      .select('category')
      .eq('is_published', true);
    (data ?? []).forEach((r: any) => {
      expect(valid.has(r.category)).toBe(true);
    });
  });

  test('events can be filtered by future start_date', async () => {
    const { data, error } = await anon
      .from('events')
      .select('id, start_date')
      .eq('is_published', true)
      .gte('start_date', new Date().toISOString())
      .order('start_date')
      .limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─── TC-DB-008: Public read — groups ─────────────────────────────────────────
dbDescribe('TC-DB-008: groups — public read', () => {
  test('anon can query published groups', async () => {
    const { data, error } = await anon
      .from('groups')
      .select('id, name, is_published, category')
      .eq('is_published', true);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('group category values are within valid enum', async () => {
    const valid = new Set(['general', 'bible_study', 'youth', 'women', 'men', 'couples', 'seniors', 'outreach']);
    const { data } = await anon
      .from('groups')
      .select('category')
      .eq('is_published', true);
    (data ?? []).forEach((r: any) => {
      expect(valid.has(r.category)).toBe(true);
    });
  });
});

// ─── TC-DB-009: RLS — anon cannot write to protected tables ──────────────────
dbDescribe('TC-DB-009: RLS blocks unauthenticated writes', () => {
  test('anon cannot insert into sermons', async () => {
    const { error } = await anon
      .from('sermons')
      .insert({ title: 'Rogue Sermon', pastor: 'Hacker' });
    expect(error).not.toBeNull();
  });

  test('anon cannot insert into announcements', async () => {
    const { error } = await anon
      .from('announcements')
      .insert({ title: 'Spam', body: 'Body', priority: 'urgent' });
    expect(error).not.toBeNull();
  });

  test('anon cannot insert into events', async () => {
    const { error } = await anon
      .from('events')
      .insert({ title: 'Fake Event', start_date: new Date().toISOString() });
    expect(error).not.toBeNull();
  });

  test('anon cannot insert into giving_funds', async () => {
    const { error } = await anon.from('giving_funds').insert({ name: 'Fraud Fund' });
    expect(error).not.toBeNull();
  });

  test('anon cannot insert into groups', async () => {
    const { error } = await anon.from('groups').insert({ name: 'Rogue Group' });
    expect(error).not.toBeNull();
  });

  test('anon cannot insert into users', async () => {
    const { error } = await anon.from('users').insert({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'hacker@evil.com',
    });
    expect(error).not.toBeNull();
  });

  test('anon cannot insert into donations', async () => {
    const { error } = await anon.from('donations').insert({ amount: 1 });
    expect(error).not.toBeNull();
  });

  test('anon cannot insert into prayer_requests', async () => {
    const { error } = await anon
      .from('prayer_requests')
      .insert({ title: 'Test', body: 'Test body' });
    expect(error).not.toBeNull();
  });
});

// ─── TC-DB-010: RLS — anon cannot read private tables ────────────────────────
dbDescribe('TC-DB-010: RLS blocks unauthenticated reads on private tables', () => {
  test('anon gets empty result or error reading users', async () => {
    const { data, error } = await anon.from('users').select('id, email');
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  test('anon gets empty result or error reading donations', async () => {
    const { data, error } = await anon.from('donations').select('id');
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  test('anon gets empty result or error reading prayer_requests', async () => {
    const { data, error } = await anon.from('prayer_requests').select('id');
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  test('anon gets empty result or error reading event_rsvps', async () => {
    const { data, error } = await anon.from('event_rsvps').select('id');
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  test('anon gets empty result or error reading group_members', async () => {
    const { data, error } = await anon.from('group_members').select('id');
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});

// ─── TC-DB-011: Pagination and ordering ──────────────────────────────────────
dbDescribe('TC-DB-011: Pagination and result ordering', () => {
  test('giving_funds supports range pagination', async () => {
    const { data, error } = await anon
      .from('giving_funds')
      .select('id, name')
      .range(0, 1);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeLessThanOrEqual(2);
  });

  test('announcements can be limited', async () => {
    const { data, error } = await anon
      .from('announcements')
      .select('id')
      .eq('is_published', true)
      .limit(3);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeLessThanOrEqual(3);
  });

  test('sermon_series ordered by created_at ascending', async () => {
    const { data, error } = await anon
      .from('sermon_series')
      .select('id, created_at')
      .order('created_at', { ascending: true });
    expect(error).toBeNull();
    if ((data ?? []).length > 1) {
      const dates = data!.map((r) => new Date(r.created_at).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i + 1]);
      }
    }
  });

  test('giving_funds count matches select', async () => {
    const { data } = await anon.from('giving_funds').select('id').eq('is_active', true);
    const { count } = await anon
      .from('giving_funds')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    expect(count).toBe((data ?? []).length);
  });
});

// ─── TC-DB-012: Schema shape validation ──────────────────────────────────────
dbDescribe('TC-DB-012: Schema shape — required fields present on returned rows', () => {
  test('giving_funds rows have id, name, is_active, created_at', async () => {
    const { data } = await anon.from('giving_funds').select('*').limit(3);
    (data ?? []).forEach((r: any) => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('is_active');
      expect(r).toHaveProperty('created_at');
    });
  });

  test('sermon_series rows have id, title, is_active', async () => {
    const { data } = await anon.from('sermon_series').select('*').limit(3);
    (data ?? []).forEach((r: any) => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('title');
      expect(r).toHaveProperty('is_active');
    });
  });

  test('announcements rows have id, title, body, priority, is_published', async () => {
    const { data } = await anon
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .limit(3);
    (data ?? []).forEach((r: any) => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('title');
      expect(r).toHaveProperty('body');
      expect(r).toHaveProperty('priority');
      expect(r).toHaveProperty('is_published');
    });
  });
});

// ─── TC-DB-013: Service role — full read access ───────────────────────────────
dbDescribe('TC-DB-013: Service role read access to all tables', () => {
  EXPECTED_TABLES.forEach((table) => {
    test(`service role can SELECT from "${table}"`, async () => {
      if (!hasServiceKey) {
        console.warn(`[SKIP] No service role key — skipping ${table}`);
        return;
      }
      const { error } = await service.from(table).select('*').limit(1);
      expect(error).toBeNull();
    });
  });
});

// ─── TC-DB-014: Service role — constraint enforcement ────────────────────────
dbDescribe('TC-DB-014: Column constraint enforcement (requires service role)', () => {
  test('sermons: missing title is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('sermons').insert({ pastor: 'No Title' });
    expect(error).not.toBeNull();
  });

  test('sermons: is_published defaults to false', async () => {
    if (!hasServiceKey) return;
    const title = `Constraint Test ${Date.now()}`;
    const { data, error } = await service
      .from('sermons')
      .insert({ title, pastor: 'Test' })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.is_published).toBe(false);
    if (data?.id) await service.from('sermons').delete().eq('id', data.id);
  });

  test('events: missing start_date is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('events').insert({ title: 'No Date' });
    expect(error).not.toBeNull();
  });

  test('events: invalid category is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('events').insert({
      title: 'Bad Cat',
      start_date: new Date().toISOString(),
      category: 'invalid_value',
    });
    expect(error).not.toBeNull();
  });

  test('events: category defaults to general', async () => {
    if (!hasServiceKey) return;
    const { data, error } = await service
      .from('events')
      .insert({ title: `Default Cat ${Date.now()}`, start_date: new Date().toISOString() })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.category).toBe('general');
    if (data?.id) await service.from('events').delete().eq('id', data.id);
  });

  test('announcements: missing title is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('announcements')
      .insert({ body: 'Body without title', priority: 'normal' });
    expect(error).not.toBeNull();
  });

  test('announcements: invalid priority is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('announcements').insert({
      title: 'Test',
      body: 'Body',
      priority: 'critical',
    });
    expect(error).not.toBeNull();
  });

  test('announcements: is_published defaults to true', async () => {
    if (!hasServiceKey) return;
    const { data, error } = await service
      .from('announcements')
      .insert({ title: `Default Pub ${Date.now()}`, body: 'Some body text' })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.is_published).toBe(true);
    if (data?.id) await service.from('announcements').delete().eq('id', data.id);
  });

  test('donations: zero amount is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('donations')
      .insert({ amount: 0, payment_type: 'one_time', status: 'pending' });
    expect(error).not.toBeNull();
  });

  test('donations: negative amount is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('donations')
      .insert({ amount: -100, payment_type: 'one_time', status: 'pending' });
    expect(error).not.toBeNull();
  });

  test('donations: invalid payment_type is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('donations')
      .insert({ amount: 25, payment_type: 'crypto', status: 'pending' });
    expect(error).not.toBeNull();
  });

  test('donations: invalid status is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('donations')
      .insert({ amount: 25, payment_type: 'one_time', status: 'disputed' });
    expect(error).not.toBeNull();
  });

  test('groups: missing name is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('groups').insert({ category: 'general' });
    expect(error).not.toBeNull();
  });

  test('groups: invalid category is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('groups')
      .insert({ name: 'Bad', category: 'teens' });
    expect(error).not.toBeNull();
  });

  test('groups: is_open defaults to true', async () => {
    if (!hasServiceKey) return;
    const { data, error } = await service
      .from('groups')
      .insert({ name: `Default Test ${Date.now()}` })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.is_open).toBe(true);
    if (data?.id) await service.from('groups').delete().eq('id', data.id);
  });

  test('prayer_requests: missing title is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('prayer_requests')
      .insert({ body: 'Body without title' });
    expect(error).not.toBeNull();
  });

  test('prayer_requests: invalid category is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('prayer_requests')
      .insert({ title: 'Test', body: 'Body', category: 'invalid' });
    expect(error).not.toBeNull();
  });

  test('prayer_requests: is_anonymous defaults to false', async () => {
    if (!hasServiceKey) return;
    const { data, error } = await service
      .from('prayer_requests')
      .insert({ title: `Anon Test ${Date.now()}`, body: 'Some body text' })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.is_anonymous).toBe(false);
    expect(data?.status).toBe('open');
    if (data?.id) await service.from('prayer_requests').delete().eq('id', data.id);
  });

  test('sermon_series: missing title is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('sermon_series')
      .insert({ description: 'No title' });
    expect(error).not.toBeNull();
  });

  test('sermon_series: is_active defaults to true', async () => {
    if (!hasServiceKey) return;
    const { data, error } = await service
      .from('sermon_series')
      .insert({ title: `Series Test ${Date.now()}` })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.is_active).toBe(true);
    if (data?.id) await service.from('sermon_series').delete().eq('id', data.id);
  });

  test('giving_funds: missing name is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service
      .from('giving_funds')
      .insert({ description: 'No name' });
    expect(error).not.toBeNull();
  });

  test('users: invalid role is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('users').insert({
      id: '00000000-0000-0000-0000-000000000099',
      email: 'bad-role@test.com',
      role: 'superuser',
    });
    expect(error).not.toBeNull();
  });

  test('users: invalid status is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('users').insert({
      id: '00000000-0000-0000-0000-000000000099',
      email: 'bad-status@test.com',
      status: 'banned',
    });
    expect(error).not.toBeNull();
  });
});

// ─── TC-DB-015: Foreign key integrity ────────────────────────────────────────
dbDescribe('TC-DB-015: Foreign key constraint enforcement (requires service role)', () => {
  test('sermon with non-existent series_id is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('sermons').insert({
      title: 'Orphan Sermon',
      pastor: 'Test',
      series_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(error).not.toBeNull();
  });

  test('event_rsvp with non-existent event_id is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('event_rsvps').insert({
      event_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
  });

  test('donation with non-existent fund_id is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('donations').insert({
      amount: 10,
      fund_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(error).not.toBeNull();
  });

  test('group_member with non-existent group_id is rejected', async () => {
    if (!hasServiceKey) return;
    const { error } = await service.from('group_members').insert({
      group_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
  });
});

// ─── TC-DB-016: Full CRUD round-trip — giving_funds ──────────────────────────
dbDescribe('TC-DB-016: CRUD round-trip on giving_funds (requires service role)', () => {
  const fundName = `CRUD Test Fund ${Date.now()}`;
  let fundId: string;

  test('INSERT — creates a giving fund', async () => {
    if (!hasServiceKey) return;
    const { data, error } = await service
      .from('giving_funds')
      .insert({ name: fundName, description: 'Test', goal_amount: 9999 })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.name).toBe(fundName);
    expect(Number(data?.goal_amount)).toBe(9999);
    fundId = data?.id;
  });

  test('SELECT — retrieves the fund by id', async () => {
    if (!hasServiceKey || !fundId) return;
    const { data, error } = await service
      .from('giving_funds')
      .select('id, name, goal_amount')
      .eq('id', fundId)
      .single();
    expect(error).toBeNull();
    expect(data?.name).toBe(fundName);
  });

  test('UPDATE — changes goal_amount', async () => {
    if (!hasServiceKey || !fundId) return;
    const { data, error } = await service
      .from('giving_funds')
      .update({ goal_amount: 19999 })
      .eq('id', fundId)
      .select()
      .single();
    expect(error).toBeNull();
    expect(Number(data?.goal_amount)).toBe(19999);
  });

  test('DELETE — removes the fund and confirms absence', async () => {
    if (!hasServiceKey || !fundId) return;
    const { error } = await service.from('giving_funds').delete().eq('id', fundId);
    expect(error).toBeNull();
    const { data } = await service
      .from('giving_funds')
      .select('id')
      .eq('id', fundId)
      .maybeSingle();
    expect(data).toBeNull();
  });
});

// ─── TC-DB-017: Sermon publish lifecycle ─────────────────────────────────────
dbDescribe('TC-DB-017: Sermon publish/unpublish lifecycle (requires service role)', () => {
  const title = `Lifecycle Sermon ${Date.now()}`;
  let sermonId: string;

  test('INSERT — creates unpublished sermon', async () => {
    if (!hasServiceKey) return;
    const { data, error } = await service
      .from('sermons')
      .insert({ title, pastor: 'Test Pastor', duration_minutes: 42 })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.is_published).toBe(false);
    sermonId = data?.id;
  });

  test('anon cannot see unpublished sermon', async () => {
    if (!hasServiceKey || !sermonId) return;
    const { data } = await anon
      .from('sermons')
      .select('id')
      .eq('id', sermonId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  test('UPDATE — publish the sermon', async () => {
    if (!hasServiceKey || !sermonId) return;
    const { data, error } = await service
      .from('sermons')
      .update({ is_published: true, published_at: new Date().toISOString() })
      .eq('id', sermonId)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.is_published).toBe(true);
    expect(data?.published_at).not.toBeNull();
  });

  test('anon can now see the published sermon', async () => {
    if (!hasServiceKey || !sermonId) return;
    const { data, error } = await anon
      .from('sermons')
      .select('id, is_published')
      .eq('id', sermonId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.is_published).toBe(true);
  });

  test('DELETE — clean up test sermon', async () => {
    if (!hasServiceKey || !sermonId) return;
    const { error } = await service.from('sermons').delete().eq('id', sermonId);
    expect(error).toBeNull();
  });
});

// ─── TC-DB-018: Announcement visibility lifecycle ────────────────────────────
dbDescribe('TC-DB-018: Announcement visibility lifecycle (requires service role)', () => {
  const annTitle = `Visibility Test ${Date.now()}`;
  let annId: string;

  test('INSERT — creates a published announcement', async () => {
    if (!hasServiceKey) return;
    const { data, error } = await service
      .from('announcements')
      .insert({ title: annTitle, body: 'Test body content', priority: 'low' })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.is_published).toBe(true);
    annId = data?.id;
  });

  test('anon can see the published announcement', async () => {
    if (!hasServiceKey || !annId) return;
    const { data } = await anon
      .from('announcements')
      .select('id')
      .eq('id', annId)
      .maybeSingle();
    expect(data).not.toBeNull();
  });

  test('UPDATE — unpublish the announcement', async () => {
    if (!hasServiceKey || !annId) return;
    const { error } = await service
      .from('announcements')
      .update({ is_published: false })
      .eq('id', annId);
    expect(error).toBeNull();
  });

  test('anon no longer sees unpublished announcement', async () => {
    if (!hasServiceKey || !annId) return;
    const { data } = await anon
      .from('announcements')
      .select('id')
      .eq('id', annId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  test('DELETE — clean up test announcement', async () => {
    if (!hasServiceKey || !annId) return;
    const { error } = await service.from('announcements').delete().eq('id', annId);
    expect(error).toBeNull();
  });
});
