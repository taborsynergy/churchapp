import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrStaff, adminClient } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminOrStaff(req.headers.get('authorization'));
    if (!auth.ok) return auth.response;

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
      present: Boolean(r.present),
      marked_at: new Date().toISOString(),
    }));

    const { error } = await adminClient()
      .from('attendance')
      .upsert(rows, { onConflict: 'event_id,user_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
