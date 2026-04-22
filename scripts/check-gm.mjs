import { createClient } from '@supabase/supabase-js';
const SVC = 'SUPABASE_SERVICE_ROLE_KEY_REDACTED';
const svc = createClient('https://uskeyzsburxfdmqoghnw.supabase.co', SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const r = await svc.from('group_members').select('*').limit(1);
console.log('group_members:', r.data?.[0] ? Object.keys(r.data[0]) : (r.error?.message || 'empty'));
const r2 = await svc.from('prayer_requests').select('*').limit(1);
console.log('prayer_requests:', r2.data?.[0] ? Object.keys(r2.data[0]) : (r2.error?.message || 'empty'));
const r3 = await svc.from('sermons').select('id,title').limit(1);
console.log('sermons sample:', r3.data);
