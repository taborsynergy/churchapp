// GET /api/subscribe/status
// Polled by the success page to detect when the PayPal webhook has activated the license.

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/request-helpers';
import { checkRateLimitStrict, rateLimitHeaders } from '@/lib/security/rate-limiter';
import { requireAuth, resolveChurchId, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const rl = await checkRateLimitStrict(`subscribe-status:${getClientIp(req)}`, 30);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(rl) });

  const auth = await requireAuth(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  const churchId = await resolveChurchId(auth.userId);
  if (!churchId) return NextResponse.json({ status: 'no_church' });

  const supabase = adminClient();
  const { data } = await supabase
    .from('licenses')
    .select('status, plan, expires_at, paypal_subscription_id')
    .eq('church_id', churchId)
    .single();

  return NextResponse.json({
    status:               data?.status ?? 'unknown',
    plan:                 data?.plan,
    expiresAt:            data?.expires_at,
    hasPaypalSubscription: !!data?.paypal_subscription_id,
  });
}
