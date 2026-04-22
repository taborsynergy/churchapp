import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = ['events', 'sermon_series', 'sermons', 'announcements', 'groups', 'group_members', 'giving_funds'];

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getCallerRole(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user } } = await client.auth.getUser(token);
  if (!user) return null;
  const svc = adminClient();
  const { data } = await svc.from('church_users').select('role').eq('id', user.id).single();
  return data?.role ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const role = await getCallerRole(req.headers.get('authorization'));
    if (!role || !['admin', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { table, operation, payload, id } = body as {
      table: string;
      operation: 'insert' | 'update' | 'delete';
      payload?: Record<string, unknown>;
      id?: string;
    };

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Table not allowed' }, { status: 400 });
    }

    const svc = adminClient();
    let result;

    if (operation === 'insert') {
      result = await svc.from(table).insert(payload!).select().single();
    } else if (operation === 'update') {
      if (!id) return NextResponse.json({ error: 'id required for update' }, { status: 400 });
      result = await svc.from(table).update(payload!).eq('id', id).select().single();
    } else if (operation === 'delete') {
      if (!id) return NextResponse.json({ error: 'id required for delete' }, { status: 400 });
      result = await svc.from(table).delete().eq('id', id);
    } else {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
    return NextResponse.json({ data: result.data ?? null });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
