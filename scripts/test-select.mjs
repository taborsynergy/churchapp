import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON || !SVC) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const user = createClient(SUPABASE_URL, ANON);
const svc = createClient(SUPABASE_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

await user.auth.signInWithPassword({ email: 'uitest.admin@gracechurch.demo', password: 'UiTest@Admin1' });

async function testSelect(table, query) {
  const { data, error } = await query;
  if (error) console.log(`  ${table} SELECT: FAIL - ${error.message}`);
  else console.log(`  ${table} SELECT: OK (${data?.length ?? 0} rows), sample titles: ${data?.slice(0,2).map(r => r.title || r.name || r.id).join(', ')}`);
}

console.log('--- As admin user (JWT) ---');
await testSelect('events', user.from('events').select('id,title,start_date,is_published').order('created_at', { ascending: false }).limit(5));
await testSelect('groups', user.from('groups').select('id,name,published').order('created_at', { ascending: false }).limit(5));
await testSelect('announcements', user.from('announcements').select('id,title,is_published').order('created_at', { ascending: false }).limit(5));
await testSelect('prayer_requests', user.from('prayer_requests').select('id,title,status').order('created_at', { ascending: false }).limit(5));
await testSelect('sermon_series', user.from('sermon_series').select('id,title').order('created_at', { ascending: false }).limit(5));

console.log('\n--- Service role (bypass RLS) ---');
await testSelect('events', svc.from('events').select('id,title,is_published').ilike('title', '%UI Test%'));
await testSelect('groups', svc.from('groups').select('id,name,published').ilike('name', '%UI Test%'));
await testSelect('announcements', svc.from('announcements').select('id,title').ilike('title', '%UI Test%'));
await testSelect('prayer_requests', svc.from('prayer_requests').select('id,title').ilike('title', '%UI Test%'));
await testSelect('sermon_series', svc.from('sermon_series').select('id,title').ilike('title', '%UI Test%'));
await testSelect('sermons', svc.from('sermons').select('id,title').ilike('title', '%UI Test%'));

await user.auth.signOut();
