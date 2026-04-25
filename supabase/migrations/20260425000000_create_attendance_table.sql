-- Create attendance table for tracking event attendance

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  marked_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS attendance_event_id_idx ON attendance(event_id);
CREATE INDEX IF NOT EXISTS attendance_user_id_idx ON attendance(user_id);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Members can view their own attendance records (used on profile page)
CREATE POLICY "Members can view own attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins and staff can view all attendance
CREATE POLICY "Admins can view all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM church_users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );
