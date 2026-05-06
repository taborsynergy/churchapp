/**
 * Setup script: ensures the UI test admin user exists with role='admin'.
 * Run with: node scripts/setup-test-user.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const TEST_EMAIL = 'uitest.admin@gracechurch.demo';
const TEST_PASSWORD = 'UiTest@Admin1';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('=== UI Test Admin Setup ===\n');

  // 1. Check if auth user exists by trying to sign in
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  let authUserId;

  if (signInError) {
    console.log('Auth user does not exist or wrong password. Creating...');
    // Create user via admin API
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (createError) {
      console.error('Failed to create auth user:', createError.message);
      process.exit(1);
    }
    authUserId = createData.user.id;
    console.log('Created auth user:', authUserId);
  } else {
    authUserId = signInData.user.id;
    console.log('Auth user exists:', authUserId);
    await anonClient.auth.signOut();
  }

  // 2. Check public users table
  const { data: publicUser, error: fetchError } = await admin
    .from('users')
    .select('id, email, role, status')
    .eq('id', authUserId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching public user:', fetchError.message);
  }

  if (!publicUser) {
    console.log('Public user record not found. Creating...');
    const { error: insertError } = await admin.from('users').insert({
      id: authUserId,
      email: TEST_EMAIL,
      full_name: 'UI Test Admin',
      role: 'admin',
      status: 'active',
    });
    if (insertError) {
      console.error('Failed to insert public user:', insertError.message);
      process.exit(1);
    }
    console.log('Created public user with role=admin');
  } else {
    console.log('Public user found:', publicUser);
    if (publicUser.role !== 'admin' || publicUser.status !== 'active') {
      console.log('Updating role to admin and status to active...');
      const { error: updateError } = await admin
        .from('users')
        .update({ role: 'admin', status: 'active' })
        .eq('id', authUserId);
      if (updateError) {
        console.error('Failed to update user role:', updateError.message);
        process.exit(1);
      }
      console.log('Updated successfully.');
    } else {
      console.log('User already has role=admin, status=active. No changes needed.');
    }
  }

  // 3. Verify by reading back
  const { data: verified } = await admin
    .from('users')
    .select('id, email, role, status')
    .eq('id', authUserId)
    .single();
  console.log('\n=== Verified user state ===');
  console.log(verified);

  // 4. Test insert capability (simulate what admin UI does)
  console.log('\n=== Testing RLS: insert as admin ===');
  // Sign in as test user to get their JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: session } = await userClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (session?.session) {
    // Test insert into events
    const { error: eventsErr } = await userClient
      .from('events')
      .insert({ title: 'Test Event', start_date: new Date().toISOString(), created_by: session.user.id })
      .select()
      .single();
    console.log('Insert events:', eventsErr ? `FAIL: ${eventsErr.message}` : 'OK');

    if (!eventsErr) {
      // Clean up test event
      await userClient.from('events').delete().eq('title', 'Test Event');
    }

    // Test insert into groups
    const { error: groupsErr } = await userClient
      .from('groups')
      .insert({ name: 'Test Group' })
      .select()
      .single();
    console.log('Insert groups:', groupsErr ? `FAIL: ${groupsErr.message}` : 'OK');

    if (!groupsErr) {
      await userClient.from('groups').delete().eq('name', 'Test Group');
    }

    await userClient.auth.signOut();
  }

  console.log('\n=== Setup complete ===');
}

main().catch(console.error);
