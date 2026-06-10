-- PayPal subscription tracking for SaaS billing
-- Pastors/churches pay Tabor Synergy via PayPal to activate their license

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS paypal_subscription_id  text,
  ADD COLUMN IF NOT EXISTS paypal_order_id          text,
  ADD COLUMN IF NOT EXISTS paypal_payer_id          text,
  ADD COLUMN IF NOT EXISTS paypal_payer_email       text,
  ADD COLUMN IF NOT EXISTS billing_cycle            text DEFAULT 'monthly',  -- monthly | annual
  ADD COLUMN IF NOT EXISTS plan_price_usd           numeric(8,2),
  ADD COLUMN IF NOT EXISTS next_billing_date        timestamptz;

CREATE INDEX IF NOT EXISTS idx_licenses_paypal_sub
  ON licenses(paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_licenses_paypal_order
  ON licenses(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- PayPal webhook events log (for audit + retry safety)
CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         uuid REFERENCES churches(id),
  event_id          text UNIQUE NOT NULL,          -- PayPal event ID (idempotency)
  event_type        text NOT NULL,                  -- BILLING.SUBSCRIPTION.ACTIVATED etc.
  resource_type     text,                           -- subscription | order | payment
  resource_id       text,                           -- subscription_id or order_id
  payload           jsonb NOT NULL,
  status            text DEFAULT 'pending',         -- pending | processed | failed | skipped
  processed_at      timestamptz,
  error             text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paypal_events_status
  ON paypal_webhook_events(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_paypal_events_resource
  ON paypal_webhook_events(resource_id);
