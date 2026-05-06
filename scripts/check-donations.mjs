import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SVC) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const svc = createClient(SUPABASE_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

// Try inserting with minimal fields to get schema
const { data: funds } = await svc.from('giving_funds').select('id').limit(1);
const fundId = funds?.[0]?.id;

const { data, error } = await svc.from('donations').insert({ fund_id: fundId, amount: 1 }).select().single();
console.log('minimal insert result:', error?.message ?? `OK: ${JSON.stringify(Object.keys(data ?? {}))}`);
if (data) {
  await svc.from('donations').delete().eq('id', data.id);
  console.log('cols:', Object.keys(data));
}
