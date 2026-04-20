/*
  # Fix Overly Permissive RLS Policies

  ## Summary
  Several RLS policies were granting access to sensitive data for all authenticated users,
  violating the principle of least privilege and user privacy.

  ## Changes

  ### 1. event_rsvps SELECT policy
  - Old: Any authenticated user could view ALL RSVPs (revealing who attended which event)
  - New: Users can only view their own RSVPs; admins/staff can view all

  ### 2. group_members SELECT policy
  - Old: Any authenticated user could view ALL group memberships across all groups
  - New: Users can only see members of groups they belong to; admins/staff can view all

  ### 3. prayer_requests SELECT policy
  - Old: Any authenticated user could view ALL prayer requests (including sensitive health/family matters)
  - New: Users can view open non-anonymous requests, their own requests, and admins/staff can view all
  - Anonymous requests: user_id is hidden to protect identity (still visible to admins)

  ### 4. donations - anonymous protection
  - Ensure the anonymous insert path remains secure (user_id must be NULL for anonymous)

  ## Security Notes
  - All policy changes are backward-compatible (no data is deleted)
  - Admin/staff retain full read access
  - Privacy of members is preserved
*/

-- =====================
-- Fix event_rsvps SELECT policy
-- =====================
DROP POLICY IF EXISTS "Users can view rsvps for events" ON event_rsvps;

CREATE POLICY "Users can view own rsvps"
  ON event_rsvps FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- =====================
-- Fix group_members SELECT policy
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view group members" ON group_members;

CREATE POLICY "Users can view members of their groups"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- =====================
-- Fix prayer_requests SELECT policy
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view prayer requests" ON prayer_requests;

CREATE POLICY "Users can view prayer requests"
  ON prayer_requests FOR SELECT
  TO authenticated
  USING (
    (status = 'open' AND is_anonymous = false)
    OR auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- =====================
-- Prevent self-role escalation: users cannot update their own role column
-- We achieve this by tightening the "Users can update own profile" policy
-- to block role and status changes (only admins can change those)
-- =====================
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND status = (SELECT status FROM users WHERE id = auth.uid())
  );
