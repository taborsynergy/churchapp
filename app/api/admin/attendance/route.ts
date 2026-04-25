import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getAuthUser(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await anon.auth.getUser(token);
  return user ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is admin or staff via service role (bypasses RLS)
    const svc = adminClient();
    const { data: profile } = await svc
      .from('church_users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role;
    if (!role || !['admin', 'staff'].includes(role)) {
      // Fallback: try 'users' table (matches migration table name)
      const { data: altProfile } = await svc
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (!altProfile?.role || !['admin', 'staff'].includes(altProfile.role)) {
        return NextResponse.json(
          { error: `Forbidden: role=${role ?? altProfile?.role ?? 'null'}` },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { event_id, records } = body as {
      event_id: string;
      records: { user_id: string; present: boolean }[];
    };

    if (!event_id || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'event_id and non-empty records are required' }, { status: 400 });
    }

    const rows = records.map((r) => ({
      event_id,
      user_id: r.user_id,
      present: r.present,
      marked_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await svc
      .from('attendance')
      .upsert(rows, { onConflict: 'event_id,user_id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
