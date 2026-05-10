-- ============================================================
-- MIGRATION: Per-church payment gateway credentials
-- ============================================================
-- Churches store their own Stripe and Razorpay API keys here.
-- Edge Functions and API routes fetch these at runtime so
-- donations go directly into each church's payment account.
-- ============================================================

CREATE TABLE IF NOT EXISTS church_payment_keys (
  church_id               UUID PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
  stripe_publishable_key  TEXT,
  stripe_secret_key       TEXT,
  stripe_webhook_secret   TEXT,
  razorpay_key_id         TEXT,
  razorpay_key_secret     TEXT,
  razorpay_webhook_secret TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE church_payment_keys ENABLE ROW LEVEL SECURITY;

-- Super-admin can read/write all churches' keys
CREATE POLICY "super_admin_all_payment_keys" ON church_payment_keys
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@taborsynergy.com');

-- Church admin can read/write only their own church's keys
CREATE POLICY "church_admin_own_payment_keys" ON church_payment_keys
  FOR ALL USING (
    church_id IN (
      SELECT church_id FROM church_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE TRIGGER trg_church_payment_keys_updated_at
  BEFORE UPDATE ON church_payment_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_church_payment_keys_church_id ON church_payment_keys(church_id);
