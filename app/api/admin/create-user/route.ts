import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminClient } from '@/lib/api-auth';
import { checkRateLimitStrict, rateLimitHeaders } from '@/lib/security/rate-limiter';

const VALID_ROLES = ['member', 'staff', 'admin', 'pending'] as const;
const VALID_STATUSES = ['active', 'pending', 'suspended'] as const;
const RATE_LIMIT_MAX = 20;

function sanitize(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  const rl = await checkRateLimitStrict(`create-user:${auth.userId}`, RATE_LIMIT_MAX);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before creating more users.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

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
    return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }
  if (safePassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!/[A-Z]/.test(safePassword)) {
    return NextResponse.json({ error: 'Password must contain at least one uppercase letter' }, { status: 400 });
  }
  if (!/[0-9]/.test(safePassword)) {
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
  }
  if (!/[^A-Za-z0-9]/.test(safePassword)) {
    return NextResponse.json(
      { error: 'Password must contain at least one special character' },
      { status: 400 }
    );
  }

  const safeRole = VALID_ROLES.includes(body.role as any) ? (body.role as string) : 'member';
  const safeStatus = VALID_STATUSES.includes(body.status as any) ? (body.status as string) : 'active';

  const svc = adminClient();

  const { data: authData, error: createError } = await svc.auth.admin.createUser({
    email: safeEmail,
    password: safePassword,
    email_confirm: true,
  });

  if (createError) {
    const lower = createError.message.toLowerCase();
    const msg =
      lower.includes('already registered') || lower.includes('already exists') || lower.includes('unique')
        ? 'A user with this email already exists'
        : 'Failed to create account';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: profileError } = await svc.from('church_users').insert({
    id: authData.user.id,
    email: safeEmail,
    full_name: safeName,
    role: safeRole,
    status: safeStatus,
  });

  if (profileError) {
    await svc.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
