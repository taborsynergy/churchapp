import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const TEST_EMAIL = 'uitest.admin@gracechurch.demo';
const TEST_PASSWORD = 'UiTest@Admin1';

async function main() {
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: session, error: loginErr } = await userClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (loginErr) { console.error('Login failed:', loginErr.message); process.exit(1); }

  const uid = session.user.id;
  console.log('Logged in as:', TEST_EMAIL, 'uid:', uid);

  async function testInsert(table, payload, cleanup) {
    const { data, error } = await userClient.from(table).insert(payload).select().single();
    if (error) {
      console.log(`  ${table}: FAIL - ${error.message}`);
    } else {
      console.log(`  ${table}: OK (id=${data.id})`);
      if (cleanup) await cleanup(data);
    }
  }

  console.log('\n--- Testing inserts as admin user ---');
  await testInsert('events',
    { title: 'Test Event RLS', start_date: new Date().toISOString() },
    async (d) => { await userClient.from('events').delete().eq('id', d.id); }
  );
  await testInsert('events',
    { title: 'Test Event RLS No Creator', start_date: new Date().toISOString() },
    async (d) => { await userClient.from('events').delete().eq('id', d.id); }
  );
  await testInsert('sermon_series',
    { title: 'Test Series RLS' },
    async (d) => { await userClient.from('sermon_series').delete().eq('id', d.id); }
  );
  await testInsert('giving_funds',
    { name: 'Test Fund RLS', goal_amount: 1000 },
    async (d) => { await userClient.from('giving_funds').delete().eq('id', d.id); }
  );
  await testInsert('announcements',
    { title: 'Test Ann RLS', body: 'Test body' },
    async (d) => { await userClient.from('announcements').delete().eq('id', d.id); }
  );
  await testInsert('groups',
    { name: 'Test Group RLS' },
    async (d) => { await userClient.from('groups').delete().eq('id', d.id); }
  );

  // Try service role to check what policies exist
  console.log('\n--- Checking via service role (bypasses RLS) ---');
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: evTest, error: evErr } = await svc.from('events').insert({ title: 'SvcRole Test', start_date: new Date().toISOString() }).select().single();
  console.log('Service role events insert:', evErr ? `FAIL: ${evErr.message}` : `OK id=${evTest?.id}`);
  if (evTest) await svc.from('events').delete().eq('id', evTest.id);

  await userClient.auth.signOut();
}

main().catch(console.error);
