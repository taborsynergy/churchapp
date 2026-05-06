import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, adminClient } from '@/lib/api-auth';

const ALLOWED_PAYMENT_TYPES = new Set(['one_time', 'recurring']);
const MIN_PAISE = 100;        // ₹1
const MAX_PAISE = 10_000_000; // ₹1,00,000

function sanitize(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req.headers.get('authorization'));
  if (!auth.ok) return auth.response;

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payment processing unavailable.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  const { amount, fund_id, fund_name, payment_type, donor_name, donor_email } = body;

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < MIN_PAISE || amount > MAX_PAISE) {
    return NextResponse.json({ error: 'Invalid amount. Must be between ₹1 and ₹1,00,000.' }, { status: 400 });
  }

  const safePaymentType = ALLOWED_PAYMENT_TYPES.has(payment_type as string) ? (payment_type as string) : 'one_time';

  const db = adminClient();

  // Verify fund
  const resolvedFundId = typeof fund_id === 'string' && fund_id.length > 0 ? fund_id : null;
  if (resolvedFundId) {
    const { data: fund } = await db.from('giving_funds').select('id').eq('id', resolvedFundId).eq('is_active', true).maybeSingle();
    if (!fund) return NextResponse.json({ error: 'Invalid or inactive fund.' }, { status: 400 });
  }

  // Create Razorpay order
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: `don_${Date.now()}`,
      notes: {
        fund_id: resolvedFundId ?? '',
        fund_name: sanitize(fund_name, 100),
        donor_name: sanitize(donor_name, 100),
        user_id: auth.userId ?? '',
      },
    }),
  });

  if (!rzpRes.ok) {
    console.error('Razorpay order error:', await rzpRes.text());
    return NextResponse.json({ error: 'Failed to create payment order.' }, { status: 502 });
  }

  const order = await rzpRes.json();

  const safeEmail = typeof donor_email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donor_email)
    ? donor_email.trim().slice(0, 254) : '';

  await db.from('donations').insert({
    user_id: auth.userId,
    fund_id: resolvedFundId,
    amount: amount / 100,
    razorpay_order_id: order.id,
    payment_type: safePaymentType,
    status: 'pending',
    donor_name: sanitize(donor_name, 100),
    donor_email: safeEmail,
    currency: 'INR',
  });

  return NextResponse.json({ order_id: order.id, key_id: keyId, amount, currency: 'INR' });
}
