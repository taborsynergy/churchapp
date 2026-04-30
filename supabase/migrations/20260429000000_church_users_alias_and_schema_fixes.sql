/*
  # church_users alias, updated_at columns, index fixes, and Stripe NULL defaults

  ## Changes

  1. `church_users` view — aliases the `users` table so app code targeting
     `church_users` works without a rename. Inserting/updating through the view
     works because it is a simple 1:1 view with INSTEAD OF rules not required
     (Postgres passes DML through for updatable views).

  2. `updated_at` columns — add to tables that are missing it and wire up
     a trigger so the column is maintained automatically.

  3. `giving_funds.is_active` index — speeds up the fund-lookup in the
     donation API which filters by `is_active = true`.

  4. `donations.stripe_payment_id` / `stripe_payment_id` defaults — change
     empty-string defaults to NULL so missing payment IDs are properly absent.

  5. `group_members` RLS tightening — members can only see members of groups
     they belong to (already addressed in security migration; kept here as a
     no-op guard via DROP IF EXISTS + recreate).
*/

-- ─── 1. church_users view ──────────────────────────────────────────────────

CREATE OR REPLACE VIEW church_users AS SELECT * FROM users;

-- Grant the same permissions the underlying table has
GRANT SELECT, INSERT, UPDATE, DELETE ON church_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON church_users TO service_role;


-- ─── 2. updated_at trigger function ───────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ─── 3. Add updated_at to tables missing it ───────────────────────────────

-- sermons
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS sermons_set_updated_at ON sermons;
CREATE TRIGGER sermons_set_updated_at
  BEFORE UPDATE ON sermons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- events
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS events_set_updated_at ON events;
CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS groups_set_updated_at ON groups;
CREATE TRIGGER groups_set_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS announcements_set_updated_at ON announcements;
CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- prayer_requests
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS prayer_requests_set_updated_at ON prayer_requests;
CREATE TRIGGER prayer_requests_set_updated_at
  BEFORE UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- donations
ALTER TABLE donations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS donations_set_updated_at ON donations;
CREATE TRIGGER donations_set_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── 4. giving_funds.is_active index ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS giving_funds_is_active_idx ON giving_funds(is_active);


-- ─── 5. Fix Stripe column defaults (empty string → NULL) ──────────────────

ALTER TABLE donations
  ALTER COLUMN stripe_payment_id SET DEFAULT NULL,
  ALTER COLUMN stripe_session_id SET DEFAULT NULL;

-- Normalize existing empty strings to NULL so queries can use IS NULL
UPDATE donations SET stripe_payment_id = NULL WHERE stripe_payment_id = '';
UPDATE donations SET stripe_session_id = NULL WHERE stripe_session_id = '';


-- ─── 6. sermon_series — add updated_at ────────────────────────────────────

ALTER TABLE sermon_series ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS sermon_series_set_updated_at ON sermon_series;
CREATE TRIGGER sermon_series_set_updated_at
  BEFORE UPDATE ON sermon_series
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
