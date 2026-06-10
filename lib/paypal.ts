// PayPal SaaS billing for ChurchConnect subscriptions
// Pastors pay Tabor Synergy to activate their church license

import { PlanName } from './licensing/types';

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// PayPal plan IDs — create these once in PayPal dashboard
// then store in env vars. Maps ChurchConnect plan → PayPal billing plan ID.
export const PAYPAL_PLAN_IDS: Record<PlanName, { monthly: string; annual: string }> = {
  starter: {
    monthly: process.env.PAYPAL_PLAN_GROW_MONTHLY!,
    annual:  process.env.PAYPAL_PLAN_GROW_ANNUAL!,
  },
  church: {
    monthly: process.env.PAYPAL_PLAN_PARISH_MONTHLY!,
    annual:  process.env.PAYPAL_PLAN_PARISH_ANNUAL!,
  },
  diocese: {
    monthly: process.env.PAYPAL_PLAN_DIOCESE_MONTHLY!,
    annual:  process.env.PAYPAL_PLAN_DIOCESE_ANNUAL!,
  },
  network: {
    monthly: process.env.PAYPAL_PLAN_NETWORK_MONTHLY!,
    annual:  process.env.PAYPAL_PLAN_NETWORK_ANNUAL!,
  },
};

export const PLAN_PRICES_USD: Record<PlanName, { monthly: number; annual: number }> = {
  starter: { monthly: 29,  annual: 278  }, // $29/mo or $278/yr (save 20%)
  church:  { monthly: 49,  annual: 470  },
  diocese: { monthly: 99,  annual: 950  },
  network: { monthly: 149, annual: 1430 },
};

/** Get a PayPal OAuth2 access token using client credentials */
export async function getPayPalAccessToken(): Promise<string> {
  const clientId     = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/** Create a PayPal subscription for a church plan */
export async function createPayPalSubscription(params: {
  planName: PlanName;
  billing: 'monthly' | 'annual';
  churchId: string;
  adminEmail: string;
  adminName: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const token    = await getPayPalAccessToken();
  const planId   = PAYPAL_PLAN_IDS[params.planName][params.billing];

  if (!planId) {
    throw new Error(
      `PayPal plan ID not configured for ${params.planName} ${params.billing}. ` +
      'Add PAYPAL_PLAN_* env vars.'
    );
  }

  const body = {
    plan_id: planId,
    quantity: '1',
    subscriber: {
      email_address: params.adminEmail,
      name: { full_name: params.adminName },
    },
    custom_id: params.churchId, // stored on all events → lets webhook find the church
    application_context: {
      brand_name:          'ChurchConnect by Tabor Synergy',
      locale:              'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action:         'SUBSCRIBE_NOW',
      payment_method: {
        payer_selected:  'PAYPAL',
        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
      },
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    },
  };

  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer:         'return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal subscription creation failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const approvalLink = (data.links as { rel: string; href: string }[]).find(
    (l) => l.rel === 'approve'
  );

  if (!approvalLink) throw new Error('PayPal approval URL not found');

  return {
    subscriptionId: data.id as string,
    approvalUrl:    approvalLink.href,
  };
}

/** Get subscription details from PayPal */
export async function getPayPalSubscription(subscriptionId: string) {
  const token = await getPayPalAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`PayPal subscription fetch failed: ${subscriptionId}`);
  return res.json();
}

/** Cancel a PayPal subscription */
export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason: string = 'Cancelled by user'
): Promise<void> {
  const token = await getPayPalAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    }
  );

  if (!res.ok && res.status !== 204) {
    throw new Error(`PayPal cancel failed for ${subscriptionId}`);
  }
}

/** Verify a PayPal webhook signature */
export async function verifyPayPalWebhook(params: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const token = await getPayPalAccessToken();

  const verifyBody = {
    auth_algo:         params.headers.get('paypal-auth-algo'),
    cert_url:          params.headers.get('paypal-cert-url'),
    transmission_id:   params.headers.get('paypal-transmission-id'),
    transmission_sig:  params.headers.get('paypal-transmission-sig'),
    transmission_time: params.headers.get('paypal-transmission-time'),
    webhook_id:        process.env.PAYPAL_WEBHOOK_ID!,
    webhook_event:     JSON.parse(params.rawBody),
  };

  const res = await fetch(
    `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyBody),
    }
  );

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
