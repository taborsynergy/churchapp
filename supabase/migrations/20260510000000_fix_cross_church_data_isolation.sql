-- ============================================================
-- MIGRATION: Fix cross-church data isolation (P0 security)
-- ============================================================

-- ── 0. ADD church_id TO users TABLE ──────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS church_id UUID;

CREATE INDEX IF NOT EXISTS idx_users_church_id ON users(church_id);

-- ── 0b. Backfill + FK only when churches table exists ────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'churches'
  ) THEN
    -- Backfill: link existing admin users to their church
    UPDATE users u
    SET church_id = c.id
    FROM churches c
    WHERE c.admin_email = u.email
      AND u.church_id IS NULL;

    -- Add FK constraint only if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_users_church_id'
        AND table_name = 'users'
        AND table_schema = 'public'
    ) THEN
      ALTER TABLE users
        ADD CONSTRAINT fk_users_church_id
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Refresh the view only if church_users is a VIEW (not a table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'church_users'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW church_users AS SELECT * FROM users';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON church_users TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON church_users TO service_role';
  END IF;
END $$;

-- ── 0c. SECURITY DEFINER helper — avoids RLS recursion ───────
-- set search_path prevents search-path injection on SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_my_church_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT church_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_my_church_id() TO authenticated;

-- ── 1. USERS — scope to own church ───────────────────────────
DROP POLICY IF EXISTS "Users can read active members" ON users;
DROP POLICY IF EXISTS "church_scope_users_select" ON users;

CREATE POLICY "church_scope_users_select" ON users
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
    OR auth.uid() = id
    OR (church_id IS NOT NULL AND church_id = get_my_church_id())
  );

-- ── 2. GIVING FUNDS — scope to own church ────────────────────
DROP POLICY IF EXISTS "Anyone can view active giving funds" ON giving_funds;
DROP POLICY IF EXISTS "church_scope_giving_funds_auth" ON giving_funds;

CREATE POLICY "church_scope_giving_funds_auth" ON giving_funds
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
    OR church_id = get_my_church_id()
    OR church_id IS NULL
  );

-- ── 3. ANNOUNCEMENTS — scope to own church ───────────────────
DROP POLICY IF EXISTS "Anyone can view published announcements" ON announcements;
DROP POLICY IF EXISTS "church_scope_announcements_select" ON announcements;

CREATE POLICY "church_scope_announcements_select" ON announcements
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
    OR church_id = get_my_church_id()
    OR church_id IS NULL
  );

-- ── 4. GROUPS — scope to own church ──────────────────────────
DROP POLICY IF EXISTS "Anyone can view published groups" ON groups;
DROP POLICY IF EXISTS "church_scope_groups_select" ON groups;

CREATE POLICY "church_scope_groups_select" ON groups
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
    OR church_id = get_my_church_id()
    OR church_id IS NULL
  );

-- ── 5. DONATIONS insert — tighten to own user ────────────────
DROP POLICY IF EXISTS "Members can insert donations" ON donations;
DROP POLICY IF EXISTS "Authenticated users can insert donations" ON donations;
DROP POLICY IF EXISTS "church_scope_donations_insert" ON donations;

CREATE POLICY "church_scope_donations_insert" ON donations
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
  );
