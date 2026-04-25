import { supabase } from './supabase';

type Operation = 'insert' | 'update' | 'delete' | 'upsert';

export async function adminWrite(
  table: string,
  operation: Operation,
  payload?: Record<string, unknown> | Record<string, unknown>[],
  id?: string
): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { data: null, error: { message: 'Not authenticated' } };

  const res = await fetch('/api/admin/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ table, operation, payload, id }),
  });
  const json = await res.json();
  if (!res.ok) return { data: null, error: { message: json.error ?? 'Unknown error' } };
  return { data: json.data ?? null, error: null };
}
