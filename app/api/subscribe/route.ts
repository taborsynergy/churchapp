// POST /api/subscribe
// Creates a PayPal subscription for a church pastor buying a SaaS plan.
// Called from the pricing page after the pastor selects a plan.

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, checkOrigin } from '@/lib/request-helpers';
import { checkRateLimitStrict, rateLimitHeaders } from '@/lib/security/rate-limiter';
import { createPayPalSubscription, PLAN_PRICES_USD } from '@/lib/paypal';
import { requireAdmin, resolveChurchId, adminClient } from '@/lib/api-auth';
import { PlanName } from '@/lib/licensing/types';
import { checkBodySize } from '@/lib/request-helpers';

const VALID_PLANS: PlanName[]   = ['starter', 'church', 'diocese', 'network'];
const VALID_BILLING             = ['monthly', 'annual'] as const;

export async function POST(req: NextRequest) {
  const sizeError = checkBodySize(req);
  if (sizeError) return sizeError;

  const originErr = checkOrigin(req); if (originErr) return originErr;

  const rl = await checkRateLimitStrict(`subscribe:${getClientIp(req)}`, 10);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(rl) });

  // ── Auth ─────────────────────────────────────────────────────
  const auth = await requireAdmin(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  const churchId = await resolveChurchId(auth.userId);
  if (!churchId) {
    return NextResponse.json(
      { error: 'Your account is not associated with a church. Please complete onboarding first.' },
      { status: 400 }
    );
  }

  // ── Parse & validate body ────────────────────────────────────
  let body: { plan?: string; billing?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const plan    = body.plan    as PlanName;
  const billing = (body.billing ?? 'monthly') as 'monthly' | 'annual';

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` },
      { status: 400 }
    );
  }
  if (!VALID_BILLING.includes(billing)) {
    return NextResponse.json(
      { error: 'Invalid billing cycle. Must be monthly or annual.' },
      { status: 400 }
    );
  }

  // ── Fetch admin details for PayPal subscriber info ───────────
  const supabase = adminClient();
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', auth.userId)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  // ── Check existing active subscription ───────────────────────
  const { data: license } = await supabase
    .from('licenses')
    .select('status, paypal_subscription_id, plan')
    .eq('church_id', churchId)
    .single();

  if (license?.status === 'active' && license?.paypal_subscription_id) {
    return NextResponse.json(
      {
        error: 'This church already has an active subscription.',
        currentPlan: license.plan,
        message: 'To change plans, use the billing portal in your admin settings.',
      },
      { status: 409 }
    );
  }

  // ── Create PayPal subscription ───────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  try {
    const { subscriptionId, approvalUrl } = await createPayPalSubscription({
      planName:   plan,
      billing,
      churchId,
      adminEmail: userData.email,
      adminName:  userData.full_name ?? 'Church Admin',
      returnUrl:  `${siteUrl}/subscribe/success?subscription_id={subscription_id}&church_id=${churchId}&plan=${plan}&billing=${billing}`,
      cancelUrl:  `${siteUrl}/pricing?cancelled=true`,
    });

    // ── Store ONLY the subscription ID so the webhook can find this church.
    // License status is intentionally NOT changed here — the webhook handler
    // is the single source of truth for license activation. This prevents
    // the inconsistent state where PayPal charges but license never activates.
    await supabase
      .from('licenses')
      .update({
        paypal_subscription_id: subscriptionId,
        billing_cycle:          billing,
        plan_price_usd:         PLAN_PRICES_USD[plan][billing],
        updated_at:             new Date().toISOString(),
        // status stays 'trial' until BILLING.SUBSCRIPTION.ACTIVATED webhook fires
      })
      .eq('church_id', churchId);

    return NextResponse.json({ approvalUrl, subscriptionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[subscribe] PayPal error:', message);
    return NextResponse.json(
      { error: 'Failed to create PayPal subscription. Please try again.' },
      { status: 502 }
    );
  }
}
