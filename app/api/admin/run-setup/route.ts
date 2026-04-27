import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminClient } from '@/lib/api-auth';

// Pending migrations that can be auto-applied via this endpoint.
// Each entry is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '20260425120000_add_answer_note',
    sql: 'ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS answer_note TEXT;',
  },
  {
    id: '20260428000000_add_rate_limits_table',
    sql: `
      CREATE TABLE IF NOT EXISTS rate_limits (
        id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        key          text        NOT NULL,
        requested_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS rate_limits_key_requested_at_idx
        ON rate_limits (key, requested_at DESC);
      ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
    `,
  },
];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  const results: { id: string; status: 'applied' | 'failed'; error?: string }[] = [];

  for (const migration of MIGRATIONS) {
    try {
      const { error } = await adminClient().rpc('exec_sql', { sql: migration.sql });
      if (error) {
        results.push({ id: migration.id, status: 'failed', error: error.message });
      } else {
        results.push({ id: migration.id, status: 'applied' });
      }
    } catch (err) {
      results.push({ id: migration.id, status: 'failed', error: String(err) });
    }
  }

  const allApplied = results.every((r) => r.status === 'applied');

  return NextResponse.json({
    success: allApplied,
    migrations: results,
    ...(!allApplied && {
      manualSteps: [
        'Open your Supabase project dashboard → SQL Editor',
        'Run each failed migration SQL manually',
        'Reload the application after completion',
      ],
    }),
  });
}
