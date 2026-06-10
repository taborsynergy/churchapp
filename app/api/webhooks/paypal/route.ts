// POST /api/webhooks/paypal
// Receives PayPal subscription lifecycle events and activates/deactivates licenses.
//
// Events handled:
//   BILLING.SUBSCRIPTION.ACTIVATED  → activate license
//   BILLING.SUBSCRIPTION.RENEWED    → extend license expiry
//   BILLING.SUBSCRIPTION.CANCELLED  → expire license (grace period)
//   BILLING.SUBSCRIPTION.SUSPENDED  → suspend license
//   BILLING.SUBSCRIPTION.EXPIRED    → expire license
//   PAYMENT.SALE.COMPLETED          → record payment (for auditing)

import { NextRequest, NextResponse } from 'next/server';
import { verifyPayPalWebhook } from '@/lib/paypal';
import { adminClient } from '@/lib/api-auth';
import { checkBodySize } from '@/lib/request-helpers';
import { audit } from '@/lib/audit';
import { GRACE_DAYS } from '@/lib/licensing/types';
import { sendEmail } from '@/lib/email/send';
import {
  subscriptionActivatedHtml,
  subscriptionRenewedHtml,
  subscriptionCancelledHtml,
} from '@/lib/email/templates';

export async function POST(req: NextRequest) {
  const sizeError = checkBodySize(req, 'webhook');
  if (sizeError) return sizeError;

  const rawBody = await req.text();
  let event: PayPalEvent;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── Verify PayPal webhook signature ────────────────────────────────
  const valid = await verifyPayPalWebhook({ headers: req.headers, rawBody });
  if (!valid) {
    console.error('[paypal-webhook] Signature verification FAILED', {
      event_id: event?.id,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const supabase    = adminClient();
  const eventId     = event.id;
  const eventType   = event.event_type;
  const resource    = (event.resource ?? {}) as Record<string, unknown>;
  const subId       = (resource.id ?? resource.billing_agreement_id ?? null) as string | null;
  const customId    = (resource.custom_id ?? null) as string | null; // = church_id set during creation

  // ── Idempotency check — skip duplicate events ───────────────────────
  const { data: existing } = await supabase
    .from('paypal_webhook_events')
    .select('id, status')
    .eq('event_id', eventId)
    .maybeSingle();

  if (existing?.status === 'processed') {
    return NextResponse.json({ ok: true, note: 'duplicate — already processed' });
  }

  // ── Log event ───────────────────────────────────────────────────────
  await supabase.from('paypal_webhook_events').upsert({
    event_id:      eventId,
    event_type:    eventType,
    resource_type: event.resource_type,
    resource_id:   subId,
    church_id:     customId ?? null,
    payload:       event,
    status:        'pending',
  }, { onConflict: 'event_id' });

  // ── Resolve church from subscription ID or custom_id ───────────────
  let churchId = customId;
  if (!churchId && subId) {
    const { data: lic } = await supabase
      .from('licenses')
      .select('church_id')
      .eq('paypal_subscription_id', subId)
      .maybeSingle();
    churchId = lic?.church_id ?? null;
  }

  if (!churchId) {
    await markEvent(supabase, eventId, 'skipped', 'church_id not found');
    return NextResponse.json({ ok: true, note: 'church not found' });
  }

  // ── Fetch church + license ──────────────────────────────────────────
  const { data: church } = await supabase
    .from('churches')
    .select('id, name, admin_email')
    .eq('id', churchId)
    .maybeSingle();

  const { data: license } = await supabase
    .from('licenses')
    .select('*')
    .eq('church_id', churchId)
    .maybeSingle();

  if (!church || !license) {
    await markEvent(supabase, eventId, 'skipped', 'church or license not found');
    return NextResponse.json({ ok: true, note: 'church or license not found' });
  }

  // ── Handle each event type ──────────────────────────────────────────
  try {
    switch (eventType) {
      // ── Subscription activated (pastor approved on PayPal) ──────────
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const billingInfo     = resource.billing_info as Record<string, unknown> | undefined;
        const subscriber      = resource.subscriber  as Record<string, unknown> | undefined;
        const nextBillingTime = billingInfo?.next_billing_time as string | undefined;
        const expiresAt       = nextBillingTime
          ? new Date(nextBillingTime).toISOString()
          : addMonths(1);

        await supabase
          .from('licenses')
          .update({
            status:                 'active',
            paypal_subscription_id: subId,
            paypal_payer_id:        (subscriber?.payer_id         ?? null) as string | null,
            paypal_payer_email:     (subscriber?.email_address    ?? null) as string | null,
            starts_at:              new Date().toISOString(),
            expires_at:             expiresAt,
            next_billing_date:      expiresAt,
            trial_ends_at:          null,
            grace_ends_at:          null,
            updated_at:             new Date().toISOString(),
          })
          .eq('church_id', churchId);

        sendEmail({
          to:      church.admin_email,
          subject: `✅ Your ChurchConnect ${license.plan} plan is now active!`,
          html:    subscriptionActivatedHtml(church.name, license.plan, expiresAt),
        });
        break;
      }

      // ── Payment received / subscription renewed ─────────────────────
      case 'BILLING.SUBSCRIPTION.RENEWED':
      case 'PAYMENT.SALE.COMPLETED': {
        const billingInfo2    = resource.billing_info as Record<string, unknown> | undefined;
        const nextBillingTime = billingInfo2?.next_billing_time as string | undefined;
        if (!nextBillingTime) break; // PAYMENT.SALE can fire for member donations — skip

        const expiresAt = new Date(nextBillingTime).toISOString();

        await supabase
          .from('licenses')
          .update({
            status:            'active',
            expires_at:        expiresAt,
            next_billing_date: expiresAt,
            grace_ends_at:     null,
            updated_at:        new Date().toISOString(),
          })
          .eq('church_id', churchId);

        sendEmail({
          to:      church.admin_email,
          subject: `🔄 ChurchConnect subscription renewed — next billing ${formatDate(expiresAt)}`,
          html:    subscriptionRenewedHtml(church.name, license.plan, expiresAt),
        });
        break;
      }

      // ── Subscription cancelled ──────────────────────────────────────
      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const graceEndsAt = addDays(GRACE_DAYS);

        await supabase
          .from('licenses')
          .update({
            status:        'grace',
            grace_ends_at: graceEndsAt,
            updated_at:    new Date().toISOString(),
          })
          .eq('church_id', churchId);

        sendEmail({
          to:      church.admin_email,
          subject: `⚠️ Your ChurchConnect subscription has been cancelled`,
          html:    subscriptionCancelledHtml(church.name, graceEndsAt),
        });
        break;
      }

      // ── Subscription suspended (payment failed) ─────────────────────
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        await supabase
          .from('licenses')
          .update({
            status:     'grace',
            grace_ends_at: addDays(GRACE_DAYS),
            updated_at: new Date().toISOString(),
          })
          .eq('church_id', churchId);
        break;
      }

      // ── Subscription expired ────────────────────────────────────────
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        await supabase
          .from('licenses')
          .update({
            status:     'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('church_id', churchId);
        break;
      }

      default:
        await markEvent(supabase, eventId, 'skipped', `unhandled event: ${eventType}`);
        return NextResponse.json({ ok: true, note: 'unhandled event type' });
    }

    await markEvent(supabase, eventId, 'processed');

    // Audit log every subscription lifecycle event
    void audit({
      churchId:     churchId,
      action:       'subscription.activate' as any,
      resourceType: 'subscription',
      resourceId:   subId ?? undefined,
      newValues:    { event_type: eventType, paypal_event_id: eventId },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[paypal-webhook] Error handling ${eventType}:`, msg);
    await markEvent(supabase, eventId, 'failed', msg);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

async function markEvent(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  status: 'processed' | 'failed' | 'skipped',
  error?: string
) {
  await supabase
    .from('paypal_webhook_events')
    .update({ status, processed_at: new Date().toISOString(), error: error ?? null })
    .eq('event_id', eventId);
}

// ── PayPal event type ──────────────────────────────────────────────────
interface PayPalEvent {
  id:            string;
  event_type:    string;
  resource_type: string;
  resource:      Record<string, unknown>;
}
