import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCallerRole(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return null;
  const svc = adminClient();
  const { data: cu } = await svc.from('church_users').select('role').eq('id', user.id).maybeSingle();
  if (cu?.role) return cu.role;
  const { data: u } = await svc.from('users').select('role').eq('id', user.id).maybeSingle();
  return u?.role ?? null;
}

export async function GET(req: NextRequest) {
  const role = await getCallerRole(req.headers.get('authorization'));
  if (!role || !['admin', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = adminClient();
  const { data, error } = await svc
    .from('small_groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ groups: data ?? [] });
}
