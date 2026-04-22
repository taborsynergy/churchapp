import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const VALID_ROLES = ['member', 'staff', 'admin', 'pending'] as const;
const VALID_STATUSES = ['active', 'pending', 'suspended'] as const;

function sanitize(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function safeError(msg: string): NextResponse {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // 1. Verify caller identity via Bearer token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const supabaseVerify = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user: caller }, error: verifyError } = await supabaseVerify.auth.getUser(token);

  if (verifyError || !caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Verify caller is an admin
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile } = await supabaseAdmin
    .from('church_users')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  // 3. Parse and validate body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const safeEmail = sanitize(body.email, 254).toLowerCase();
  const safeName = sanitize(body.full_name, 100);
  const safePassword = String(body.password ?? '');

  if (!safeEmail || !safeName || !safePassword) {
    return safeError('Email, name, and password are required');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
    return safeError('Invalid email address');
  }
  if (safePassword.length < 8) {
    return safeError('Password must be at least 8 characters');
  }

  // 4. Whitelist role and status — prevent privilege escalation
  const safeRole = VALID_ROLES.includes(body.role as any) ? (body.role as string) : 'member';
  const safeStatus = VALID_STATUSES.includes(body.status as any) ? (body.status as string) : 'active';

  // 5. Create auth user
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: safeEmail,
    password: safePassword,
    email_confirm: true,
  });

  if (createError) {
    const msg = createError.message.toLowerCase().includes('already registered')
      ? 'A user with this email already exists'
      : 'Failed to create account';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 6. Create profile row
  const { error: profileError } = await supabaseAdmin.from('church_users').insert({
    id: authData.user.id,
    email: safeEmail,
    full_name: safeName,
    role: safeRole,
    status: safeStatus,
  });

  if (profileError) {
    // Roll back the auth user if profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
