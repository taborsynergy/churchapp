import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrStaff, requireAdmin, adminClient } from '@/lib/api-auth';
import { checkBodySize, getClientIp } from '@/lib/request-helpers';
import { checkRateLimitStrict, rateLimitHeaders } from '@/lib/security/rate-limiter';

const ALLOWED_TABLES = new Set([
  'events', 'sermon_series', 'sermons', 'announcements',
  'groups', 'group_members', 'giving_funds', 'attendance',
  'church_users', 'prayer_requests',
]);

// Tables that only admins (not staff) may write to at all
const ADMIN_ONLY_TABLES = new Set(['church_users']);

// Tables that only admins (not staff) may delete from
const ADMIN_ONLY_DELETE = new Set(['church_users']);

// Fields that must never be changed via this endpoint on church_users.
// role/status are intentionally NOT blocked — admins need them to approve/reject users.
// id, email, created_at are structural and must never be mutated directly.
const CHURCH_USERS_BLOCKED_FIELDS = new Set(['id', 'email', 'created_at']);

// Allowed columns per table for upsert onConflict to prevent column injection
const ALLOWED_CONFLICT_COLS: Record<string, Set<string>> = {
  attendance: new Set(['event_id,user_id', 'id']),
  group_members: new Set(['group_id,user_id', 'id']),
  event_rsvps: new Set(['event_id,user_id', 'id']),
  church_users: new Set(['id', 'email']),
  giving_funds: new Set(['id']),
  groups: new Set(['id']),
  events: new Set(['id']),
  sermons: new Set(['id']),
  sermon_series: new Set(['id']),
  announcements: new Set(['id']),
  prayer_requests: new Set(['id']),
};

function stripBlockedFields(
  payload: Record<string, unknown>,
  blocked: Set<string>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([k]) => !blocked.has(k))
  );
}

function sanitizePayload(
  table: string,
  payload: Record<string, unknown> | Record<string, unknown>[]
): Record<string, unknown> | Record<string, unknown>[] {
  if (table !== 'church_users') return payload;
  if (Array.isArray(payload)) {
    return payload.map((row) => stripBlockedFields(row, CHURCH_USERS_BLOCKED_FIELDS));
  }
  return stripBlockedFields(payload, CHURCH_USERS_BLOCKED_FIELDS);
}

export async function POST(req: NextRequest) {
  const sizeError = checkBodySize(req);
  if (sizeError) return sizeError;

  // Rate limit: 40 requests per minute (strict — fails closed on DB error)
  const rl = await checkRateLimitStrict(`admin-write:${getClientIp(req)}`, 40);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    // church_users write operations require full admin (not just staff)
    const rawTable = (() => {
      try {
        const clone = req.clone();
        // We read table from the already-cloned body below; just peek at auth level here
        return null;
      } catch {
        return null;
      }
    })();

    const body = await req.json();
    const { table, operation, payload, id, onConflict } = body as {
      table: string;
      operation: 'insert' | 'update' | 'delete' | 'upsert';
      payload?: Record<string, unknown> | Record<string, unknown>[];
      id?: string;
      onConflict?: string;
    };

    // Select appropriate auth level based on the target table
    const authResult = ADMIN_ONLY_TABLES.has(table)
      ? await requireAdmin(req.headers.get('authorization'))
      : await requireAdminOrStaff(req.headers.get('authorization'));
    if (!authResult.ok) return authResult.response;

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: 'Table not allowed' }, { status: 400 });
    }

    if (operation === 'delete' && ADMIN_ONLY_DELETE.has(table) && authResult.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only for this table' }, { status: 403 });
    }

    // Validate and sanitize payload for protected tables
    const safePayload = payload ? sanitizePayload(table, payload) : payload;

    // Validate upsert conflict column against allowlist (prevent column injection)
    if (operation === 'upsert') {
      const allowedCols = ALLOWED_CONFLICT_COLS[table] ?? new Set(['id']);
      const requestedCol = typeof onConflict === 'string' && onConflict ? onConflict : 'id';
      if (!allowedCols.has(requestedCol)) {
        return NextResponse.json(
          { error: `Invalid onConflict column '${requestedCol}' for table '${table}'` },
          { status: 400 }
        );
      }
    }

    const svc = adminClient();
    let result;

    switch (operation) {
      case 'insert':
        if (!safePayload) return NextResponse.json({ error: 'payload required for insert' }, { status: 400 });
        result = await svc.from(table).insert(safePayload);
        break;

      case 'update':
        if (!id) return NextResponse.json({ error: 'id required for update' }, { status: 400 });
        if (!safePayload) return NextResponse.json({ error: 'payload required for update' }, { status: 400 });
        result = await svc.from(table).update(safePayload as Record<string, unknown>).eq('id', id);
        break;

      case 'delete':
        if (!id) return NextResponse.json({ error: 'id required for delete' }, { status: 400 });
        result = await svc.from(table).delete().eq('id', id);
        break;

      case 'upsert': {
        if (!safePayload) return NextResponse.json({ error: 'payload required for upsert' }, { status: 400 });
        const rows = Array.isArray(safePayload) ? safePayload : [safePayload];
        const conflictCol = typeof onConflict === 'string' && onConflict ? onConflict : 'id';
        result = await svc.from(table).upsert(rows, { onConflict: conflictCol });
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
    return NextResponse.json({ data: (result as any).data ?? null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
