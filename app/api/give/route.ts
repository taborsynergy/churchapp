import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, adminClient } from '@/lib/api-auth';

const ALLOWED_PAYMENT_TYPES = new Set(['one_time', 'recurring']);
const IS_DEMO = process.env.NODE_ENV !== 'production';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  // In production, payments must go through the Stripe Edge Function.
  // The Next.js route only operates in development/demo mode.
  if (!IS_DEMO) {
    return NextResponse.json(
      { error: 'Use the Stripe checkout endpoint for production payments.' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { fund_id, amount, payment_type, donor_name, donor_email } = body;

    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount < 1) {
      return NextResponse.json({ error: 'Invalid amount. Minimum donation is $1.' }, { status: 400 });
    }
    if (numAmount > 100_000) {
      return NextResponse.json({ error: 'Maximum single donation is $100,000.' }, { status: 400 });
    }

    if (!fund_id) {
      return NextResponse.json({ error: 'Please select a fund.' }, { status: 400 });
    }

    // Verify fund exists and is active
    const { data: fund } = await adminClient()
      .from('giving_funds')
      .select('id')
      .eq('id', fund_id)
      .eq('is_active', true)
      .maybeSingle();
    if (!fund) {
      return NextResponse.json({ error: 'Invalid or inactive fund.' }, { status: 400 });
    }

    const safePaymentType = ALLOWED_PAYMENT_TYPES.has(payment_type) ? payment_type : 'one_time';

    const { error } = await adminClient().from('donations').insert({
      user_id: auth.userId,
      fund_id,
      amount: numAmount,
      payment_type: safePaymentType,
      status: 'completed',
      donor_name: (typeof donor_name === 'string' ? donor_name : '').slice(0, 200),
      donor_email: (typeof donor_email === 'string' ? donor_email : '').slice(0, 200),
      // Demo-only: real payments use stripe_payment_id set by webhook
      stripe_payment_id: null,
      stripe_session_id: null,
    });

    if (error) {
      return NextResponse.json({ error: 'Unable to record donation. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
