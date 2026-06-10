import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import { EXPIRY_WARNING_DAYS, GRACE_DAYS } from '@/lib/licensing/types';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.LICENSE_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Idempotency: skip if already ran within the past hour to prevent duplicate warning emails
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { data: recentRun } = await adminClient()
    .from('audit_logs')
    .select('created_at')
    .eq('action', 'cron.license_check')
    .gte('created_at', oneHourAgo)
    .limit(1)
    .maybeSingle();
  if (recentRun) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Already ran within 1 hour' });
  }

  const supabase = adminClient();
  const now = new Date();

  const { data: licenses } = await supabase
    .from('licenses')
    .select('*, churches(name, admin_email)')
    .in('status', ['trial', 'active', 'grace']);

  const results = { warned: 0, expired: 0, graced: 0, errors: 0 };

  for (const lic of licenses ?? []) {
    try {
      const exp: Date | null = lic.expires_at
        ? new Date(lic.expires_at)
        : lic.trial_ends_at
          ? new Date(lic.trial_ends_at)
          : null;
      if (!exp) continue;

      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86_400_000);
      const adminEmail: string = lic.churches?.admin_email ?? '';
      const churchName: string = lic.churches?.name ?? 'Your Church';

      // Expiry warning — send at 7 days and 1 day remaining
      if (lic.status !== 'grace' && (daysLeft === EXPIRY_WARNING_DAYS || daysLeft === 1)) {
        await sendEmail({
          to: adminEmail,
          subject: `Action required: ChurchConnect ${lic.status === 'trial' ? 'trial' : 'licence'} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          html: expiryWarningHtml(churchName, daysLeft, lic.status === 'trial'),
        });
        results.warned++;
      }

      // Move active → grace
      if (lic.status === 'active' && daysLeft <= 0) {
        const graceEnds = new Date(exp);
        graceEnds.setDate(graceEnds.getDate() + GRACE_DAYS);
        await supabase
          .from('licenses')
          .update({ status: 'grace', grace_ends_at: graceEnds.toISOString() })
          .eq('id', lic.id);
        await sendEmail({
          to: adminEmail,
          subject: `Urgent: ChurchConnect licence expired — ${GRACE_DAYS}-day grace period started`,
          html: graceHtml(churchName, GRACE_DAYS),
        });
        results.graced++;
      }

      // Move grace → expired / Move trial → expired
      const graceEnd = lic.grace_ends_at ? new Date(lic.grace_ends_at) : null;
      const isTrialExpired = lic.status === 'trial' && daysLeft <= 0;
      const isGraceExpired = lic.status === 'grace' && graceEnd && graceEnd < now;

      if (isTrialExpired || isGraceExpired) {
        await supabase
          .from('licenses')
          .update({ status: 'expired' })
          .eq('id', lic.id);
        results.expired++;
      }
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results, checkedAt: now.toISOString() });
}

function expiryWarningHtml(churchName: string, days: number, isTrial: boolean) {
  return `
    <p>Dear ${churchName} admin,</p>
    <p>Your ChurchConnect ${isTrial ? 'free trial' : 'licence'} expires in <strong>${days} day${days === 1 ? '' : 's'}</strong>.</p>
    <p>To avoid any interruption to your congregation, please <a href="${process.env.NEXT_PUBLIC_SITE_URL}/pricing">renew your licence</a>.</p>
    <p>— Tabor Synergy | admin@taborsynergy.com | taborsynergy.com</p>
  `;
}

function graceHtml(churchName: string, graceDays: number) {
  return `
    <p>Dear ${churchName} admin,</p>
    <p>Your ChurchConnect licence has expired. You have a <strong>${graceDays}-day grace period</strong> before access is blocked.</p>
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/pricing">Renew now</a> to avoid interruption.</p>
    <p>— Tabor Synergy | admin@taborsynergy.com | taborsynergy.com</p>
  `;
}
