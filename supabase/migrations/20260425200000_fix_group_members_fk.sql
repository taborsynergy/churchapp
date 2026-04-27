-- Fix group_members foreign key: production user profiles are in church_users, not users.
-- Also update RLS policies to check church_users for admin/staff roles.

DROP TABLE IF EXISTS group_members CASCADE;

CREATE TABLE group_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES church_users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'co-leader', 'member')),
  joined_at  timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx  ON group_members(user_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view group members"
  ON group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership"
  ON group_members FOR UPDATE
  TO authenticated
  USING  (auth.uid() = user_id OR EXISTS (SELECT 1 FROM church_users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM church_users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Users can leave or be removed from groups"
  ON group_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM church_users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

NOTIFY pgrst, 'reload schema';
