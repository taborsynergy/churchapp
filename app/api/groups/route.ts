import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function GET() {
  const { data, error } = await adminClient()
    .from('groups')
    .select('*, group_members(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data ?? [] });
}
