import { createClient } from '@supabase/supabase-js';
const URL = 'https://uskeyzsburxfdmqoghnw.supabase.co';
const SVC = 'SUPABASE_SERVICE_ROLE_KEY_REDACTED';
const svc = createClient(URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

// Try inserting with minimal fields to get schema
const { data: funds } = await svc.from('giving_funds').select('id').limit(1);
const fundId = funds?.[0]?.id;

const { data, error } = await svc.from('donations').insert({ fund_id: fundId, amount: 1 }).select().single();
console.log('minimal insert result:', error?.message ?? `OK: ${JSON.stringify(Object.keys(data ?? {}))}`);
if (data) {
  await svc.from('donations').delete().eq('id', data.id);
  console.log('cols:', Object.keys(data));
}
