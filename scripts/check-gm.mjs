import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SVC) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const svc = createClient(SUPABASE_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const r = await svc.from('group_members').select('*').limit(1);
console.log('group_members:', r.data?.[0] ? Object.keys(r.data[0]) : (r.error?.message || 'empty'));
const r2 = await svc.from('prayer_requests').select('*').limit(1);
console.log('prayer_requests:', r2.data?.[0] ? Object.keys(r2.data[0]) : (r2.error?.message || 'empty'));
const r3 = await svc.from('sermons').select('id,title').limit(1);
console.log('sermons sample:', r3.data);
