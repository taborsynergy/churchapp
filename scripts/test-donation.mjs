import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON || !SVC) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const svc = createClient(SUPABASE_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const user = createClient(SUPABASE_URL, ANON);

// Check donations table columns
const { data: dons } = await svc.from('donations').select('*').limit(1);
console.log('donations cols:', dons?.[0] ? Object.keys(dons[0]) : 'empty');

// Check giving_funds
const { data: funds } = await svc.from('giving_funds').select('id,name').limit(1);
console.log('funds:', funds);

// Login and test donation insert
const { data: session } = await user.auth.signInWithPassword({ email: 'uitest.admin@gracechurch.demo', password: 'UiTest@Admin1' });
console.log('user id:', session?.user?.id);

if (funds?.[0] && session?.user?.id) {
  const fundId = funds[0].id;
  const now = Date.now();
  const { data, error } = await user.from('donations').insert({
    user_id: session.user.id,
    fund_id: fundId,
    amount: 25,
    payment_type: 'one_time',
    status: 'completed',
    donor_name: 'UI Test Admin',
    donor_email: 'uitest.admin@gracechurch.demo',
    is_anonymous: false,
    stripe_payment_id: `demo_${now}`,
    stripe_session_id: `demo_session_${now}`,
  }).select().single();

  console.log('donation insert:', error ? `FAIL: ${error.message}` : `OK id=${data?.id}`);
  if (data) await svc.from('donations').delete().eq('id', data.id);
}

await user.auth.signOut();
