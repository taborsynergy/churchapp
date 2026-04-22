import { createClient } from '@supabase/supabase-js';
const URL = 'https://uskeyzsburxfdmqoghnw.supabase.co';
const ANON = 'SUPABASE_ANON_KEY_REDACTED';
const SVC = 'SUPABASE_SERVICE_ROLE_KEY_REDACTED';
const svc = createClient(URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const user = createClient(URL, ANON);

const { data: funds } = await svc.from('giving_funds').select('id,name').limit(1);
const fundId = funds?.[0]?.id;

const { data: session } = await user.auth.signInWithPassword({ email: 'uitest.admin@gracechurch.demo', password: 'UiTest@Admin1' });
const uid = session?.user?.id;

console.log('Testing donation insert as authenticated user...');
const now = Date.now();
const { data, error } = await user.from('donations').insert({
  user_id: uid,
  fund_id: fundId,
  amount: 25,
  frequency: 'one_time',
  status: 'completed',
  donor_name: 'UI Test Admin',
  donor_email: 'uitest.admin@gracechurch.demo',
  stripe_payment_intent_id: `demo_${now}`,
  stripe_session_id: `demo_session_${now}`,
}).select().single();

console.log('donation insert:', error ? `FAIL: ${error.message}` : `OK id=${data?.id}`);
if (data) await svc.from('donations').delete().eq('id', data.id);

await user.auth.signOut();
