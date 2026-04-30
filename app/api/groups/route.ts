import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  // Require authentication — group membership data is not public
  const auth = await requireAuth(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  const { data, error } = await adminClient()
    .from('groups')
    .select('*, group_members(count)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data ?? [], page, limit });
}
