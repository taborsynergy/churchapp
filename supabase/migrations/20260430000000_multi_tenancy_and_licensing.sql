-- ============================================================
-- MIGRATION: Multi-tenancy, Licensing, Church Settings
-- ============================================================

-- ── 1. CHURCHES TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS churches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  admin_email   TEXT NOT NULL,
  slug          TEXT UNIQUE,
  member_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

-- Super-admin sees all; church admin sees own row
CREATE POLICY "super_admin_all_churches" ON churches
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@taborsynergy.com');

CREATE POLICY "church_admin_own" ON churches
  FOR SELECT USING (admin_email = auth.jwt() ->> 'email');

-- ── 2. LICENSES TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  plan           TEXT NOT NULL CHECK (plan IN ('starter','church','diocese')),
  status         TEXT NOT NULL CHECK (status IN ('trial','active','grace','expired','suspended'))
                 DEFAULT 'trial',
  trial_ends_at  TIMESTAMPTZ,
  starts_at      TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  grace_ends_at  TIMESTAMPTZ,
  seat_limit     INTEGER NOT NULL DEFAULT 200,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_licenses" ON licenses
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@taborsynergy.com');

CREATE POLICY "church_sees_own_license" ON licenses
  FOR SELECT USING (
    church_id IN (
      SELECT id FROM churches WHERE admin_email = auth.jwt() ->> 'email'
    )
  );

-- ── 3. CHURCH SETTINGS (white-label branding) ─────────────────
CREATE TABLE IF NOT EXISTS church_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE UNIQUE,
  church_name     TEXT,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#14b8a6',
  font_heading    TEXT DEFAULT 'Inter',
  contact_email   TEXT,
  contact_phone   TEXT,
  website_url     TEXT,
  address         TEXT,
  onboarding_done BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE church_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_settings" ON church_settings
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@taborsynergy.com');

CREATE POLICY "church_admin_own_settings" ON church_settings
  FOR ALL USING (
    church_id IN (
      SELECT id FROM churches WHERE admin_email = auth.jwt() ->> 'email'
    )
  );

-- ── 4. ADD church_id TO EXISTING TABLES ───────────────────────
-- Only add column if it doesn't already exist (idempotent)
DO $$ BEGIN
  ALTER TABLE sermons ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  ALTER TABLE groups ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  ALTER TABLE giving_funds ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  ALTER TABLE donations ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  ALTER TABLE donations ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
  ALTER TABLE donations ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
  ALTER TABLE donations ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
END $$;

-- ── 5. SOFT DELETE columns ────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE sermons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE church_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
END $$;

-- ── 6. RLS POLICIES FOR CHURCH-SCOPED TABLES ──────────────────
-- Sermons
DROP POLICY IF EXISTS "church_scope_sermons" ON sermons;
CREATE POLICY "church_scope_sermons" ON sermons
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
    OR church_id IN (
      SELECT id FROM churches WHERE admin_email = (
        SELECT email FROM church_users WHERE id = auth.uid()
      )
    )
    OR church_id IS NULL  -- legacy rows before migration
  );

-- Events
DROP POLICY IF EXISTS "church_scope_events" ON events;
CREATE POLICY "church_scope_events" ON events
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
    OR church_id IN (
      SELECT id FROM churches WHERE admin_email = (
        SELECT email FROM church_users WHERE id = auth.uid()
      )
    )
    OR church_id IS NULL
  );

-- Donations — members can see own; admin sees all in church
DROP POLICY IF EXISTS "church_scope_donations" ON donations;
CREATE POLICY "church_scope_donations" ON donations
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
    OR user_id = auth.uid()
    OR church_id IN (
      SELECT id FROM churches WHERE admin_email = (
        SELECT email FROM church_users WHERE id = auth.uid()
      )
    )
  );

-- ── 7. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_licenses_church_id ON licenses(church_id);
CREATE INDEX IF NOT EXISTS idx_church_settings_church_id ON church_settings(church_id);
CREATE INDEX IF NOT EXISTS idx_sermons_church_id ON sermons(church_id);
CREATE INDEX IF NOT EXISTS idx_events_church_id ON events(church_id);
CREATE INDEX IF NOT EXISTS idx_donations_razorpay_order ON donations(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_donations_church_id ON donations(church_id);

-- ── 8. AUTO-PROVISION TRIAL LICENSE ON CHURCH SIGNUP ──────────
CREATE OR REPLACE FUNCTION provision_trial_license()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO licenses (church_id, plan, status, trial_ends_at, seat_limit)
  VALUES (
    NEW.id,
    'starter',
    'trial',
    now() + INTERVAL '14 days',
    200
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO church_settings (church_id, church_name, onboarding_done)
  VALUES (NEW.id, NEW.name, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_church_created ON churches;
CREATE TRIGGER on_church_created
  AFTER INSERT ON churches
  FOR EACH ROW EXECUTE FUNCTION provision_trial_license();

-- ── 9. updated_at triggers for new tables ─────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_churches_updated_at ON churches;
CREATE TRIGGER trg_churches_updated_at BEFORE UPDATE ON churches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_licenses_updated_at ON licenses;
CREATE TRIGGER trg_licenses_updated_at BEFORE UPDATE ON licenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_church_settings_updated_at ON church_settings;
CREATE TRIGGER trg_church_settings_updated_at BEFORE UPDATE ON church_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
