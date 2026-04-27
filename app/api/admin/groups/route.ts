import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrStaff, adminClient } from '@/lib/api-auth';

// ─── Column probe helper ──────────────────────────────────────────────────────
// Discovers which optional columns exist in the production groups table
// by attempting an update and checking for column-not-found errors.
// Cached per process restart to avoid repeated probe failures on cold starts.

const knownMissingCols = new Set<string>();

async function safeUpdate(
  db: ReturnType<typeof adminClient>,
  id: string,
  fields: Record<string, unknown>
): Promise<string | null> {
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!knownMissingCols.has(k)) filtered[k] = v;
  }
  if (Object.keys(filtered).length === 0) return null;

  const { error } = await db.from('groups').update(filtered).eq('id', id);
  if (!error) return null;

  const missing =
    error.message.match(/column "?(\w+)"? of relation/)?.[1] ??
    error.message.match(/find the '(\w+)' column/)?.[1];

  if (missing && missing in filtered) {
    knownMissingCols.add(missing);
    delete filtered[missing];
    if (Object.keys(filtered).length > 0) {
      const { error: retryErr } = await db.from('groups').update(filtered).eq('id', id);
      if (retryErr) return retryErr.message;
    }
    return null;
  }
  return error.message;
}

// ─── GET /api/admin/groups ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrStaff(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  const db = adminClient();

  let { data, error } = await db
    .from('groups')
    .select('*, group_members(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[groups GET] join failed, retrying without group_members:', error.message);
    ({ data, error } = await db
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false }));
  }

  if (error) {
    console.error('[groups GET] final error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ groups: data ?? [] });
}

// ─── POST /api/admin/groups ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrStaff(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, ...fields } = body;
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });

  const optional: Record<string, unknown> = {};
  for (const col of ['description', 'category', 'meeting_time', 'location', 'max_members', 'image_url', 'is_published']) {
    if (col in fields) optional[col] = fields[col];
  }

  const db = adminClient();

  // ── UPDATE ──
  if (id) {
    const updateErr = await safeUpdate(db, String(id), { name, ...optional });
    if (updateErr) return NextResponse.json({ error: updateErr }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  // ── CREATE: Phase 1 — insert guaranteed column only ──
  const { data: rows, error: insertErr } = await db
    .from('groups')
    .insert({ name })
    .select('id');

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  const newId = rows?.[0]?.id;
  if (!newId) return NextResponse.json({ error: 'Insert returned no id' }, { status: 500 });

  // ── CREATE: Phase 2 — apply optional fields, skipping missing columns ──
  if (Object.keys(optional).length > 0) {
    await safeUpdate(db, newId, optional);
  }

  return NextResponse.json({ success: true, id: newId });
}

// ─── DELETE /api/admin/groups?id=<uuid> ──────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminOrStaff(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const db = adminClient();
  await db.from('group_members').delete().eq('group_id', id);
  const { error } = await db.from('groups').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
