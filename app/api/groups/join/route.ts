import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, adminClient } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  try {
    // Verify the account is active before allowing any group action
    const { data: cu } = await adminClient()
      .from('church_users')
      .select('status')
      .eq('id', auth.userId)
      .maybeSingle();
    if (!cu || cu.status !== 'active') {
      return NextResponse.json({ error: 'Account not active or pending approval' }, { status: 403 });
    }

    const body = await req.json();
    const { group_id, action } = body as { group_id: string; action: 'join' | 'leave' };
    if (!group_id || !['join', 'leave'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const svc = adminClient();

    if (action === 'leave') {
      await svc.from('group_members').delete().eq('group_id', group_id).eq('user_id', auth.userId);
      return NextResponse.json({ success: true });
    }

    // join — verify group exists and is published
    const { data: group } = await svc
      .from('groups')
      .select('id, max_members, is_published')
      .eq('id', group_id)
      .maybeSingle();
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (group.is_published === false) {
      return NextResponse.json({ error: 'Group is not available' }, { status: 404 });
    }

    // Guard against duplicate membership
    const { data: existing } = await svc
      .from('group_members')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 400 });

    // Enforce capacity limit
    if (group.max_members) {
      const { count } = await svc
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', group_id);
      if ((count ?? 0) >= group.max_members) {
        return NextResponse.json({ error: 'Group is full' }, { status: 400 });
      }
    }

    const { error } = await svc.from('group_members').insert({
      group_id,
      user_id: auth.userId,
      role: 'member',
      joined_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
