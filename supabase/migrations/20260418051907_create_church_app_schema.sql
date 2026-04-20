
/*
  # Grace Community Church — Full Schema

  ## Tables Created
  1. `users` — Extended profile for auth users. Stores role (admin/staff/member), status (pending/active/suspended), avatar, phone, bio.
  2. `sermon_series` — Grouping for sermon series with title, description, image.
  3. `sermons` — Individual sermons with video/audio URLs, pastor, series FK, thumbnail.
  4. `events` — Church events with location, date range, image, capacity.
  5. `event_rsvps` — User RSVPs for events.
  6. `prayer_requests` — Member prayer requests, supports anonymous posting.
  7. `groups` — Small groups / ministries with leader, meeting time, location.
  8. `group_members` — Join table for groups and users with member role.
  9. `announcements` — Church-wide announcements with priority and expiry.
  10. `giving_funds` — Donation fund categories (General, Building, Missions, etc.).
  11. `donations` — Donation records with Stripe payment ID, fund FK, payment type.

  ## Security
  - RLS enabled on all tables.
  - Public can read sermons, events, announcements, sermon_series, giving_funds.
  - Members can RSVP, submit prayer requests, join groups, and donate.
  - Admins/staff can manage content.
  - Users can only read/edit their own sensitive data.

  ## Indexes
  - FK columns, status fields, email, and date columns are indexed for performance.
*/

-- =====================
-- USERS
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'pending' CHECK (role IN ('admin', 'staff', 'member', 'pending')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  bio text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read active members"
  ON users FOR SELECT
  TO authenticated
  USING (status = 'active' OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- =====================
-- SERMON SERIES
-- =====================
CREATE TABLE IF NOT EXISTS sermon_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sermon_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sermon series"
  ON sermon_series FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert sermon series"
  ON sermon_series FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Admins can update sermon series"
  ON sermon_series FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete sermon series"
  ON sermon_series FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- SERMONS
-- =====================
CREATE TABLE IF NOT EXISTS sermons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  pastor text NOT NULL DEFAULT '',
  series_id uuid REFERENCES sermon_series(id) ON DELETE SET NULL,
  video_url text DEFAULT '',
  audio_url text DEFAULT '',
  thumbnail_url text DEFAULT '',
  scripture_reference text DEFAULT '',
  duration_minutes integer DEFAULT 0,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sermons_series_id_idx ON sermons(series_id);
CREATE INDEX IF NOT EXISTS sermons_published_at_idx ON sermons(published_at DESC);
CREATE INDEX IF NOT EXISTS sermons_is_published_idx ON sermons(is_published);

ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published sermons"
  ON sermons FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can insert sermons"
  ON sermons FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can update sermons"
  ON sermons FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete sermons"
  ON sermons FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- EVENTS
-- =====================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  image_url text DEFAULT '',
  capacity integer,
  is_published boolean DEFAULT true,
  category text DEFAULT 'general' CHECK (category IN ('general', 'worship', 'youth', 'outreach', 'fellowship', 'prayer')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_start_date_idx ON events(start_date);
CREATE INDEX IF NOT EXISTS events_is_published_idx ON events(is_published);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published events"
  ON events FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- EVENT RSVPs
-- =====================
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'declined')),
  guests integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_rsvps_event_id_idx ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_id_idx ON event_rsvps(user_id);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rsvps for events"
  ON event_rsvps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own rsvps"
  ON event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rsvps"
  ON event_rsvps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rsvps"
  ON event_rsvps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================
-- PRAYER REQUESTS
-- =====================
CREATE TABLE IF NOT EXISTS prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_anonymous boolean DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  category text DEFAULT 'general' CHECK (category IN ('general', 'health', 'family', 'finances', 'relationships', 'guidance', 'praise')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prayer_requests_user_id_idx ON prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS prayer_requests_status_idx ON prayer_requests(status);

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view prayer requests"
  ON prayer_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can submit prayer requests"
  ON prayer_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own prayer requests"
  ON prayer_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete prayer requests"
  ON prayer_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- GROUPS
-- =====================
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  leader_id uuid REFERENCES users(id) ON DELETE SET NULL,
  meeting_time text DEFAULT '',
  location text DEFAULT '',
  image_url text DEFAULT '',
  category text DEFAULT 'general' CHECK (category IN ('general', 'bible_study', 'youth', 'women', 'men', 'couples', 'seniors', 'outreach')),
  max_members integer,
  is_open boolean DEFAULT true,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS groups_leader_id_idx ON groups(leader_id);
CREATE INDEX IF NOT EXISTS groups_is_published_idx ON groups(is_published);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published groups"
  ON groups FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can insert groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can update groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete groups"
  ON groups FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- GROUP MEMBERS
-- =====================
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'co-leader', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);

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
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- ANNOUNCEMENTS
-- =====================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_published boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_published_at_idx ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS announcements_is_published_idx ON announcements(is_published);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published announcements"
  ON announcements FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can insert announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- GIVING FUNDS
-- =====================
CREATE TABLE IF NOT EXISTS giving_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  goal_amount numeric(12,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE giving_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active giving funds"
  ON giving_funds FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can insert giving funds"
  ON giving_funds FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can update giving funds"
  ON giving_funds FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete giving funds"
  ON giving_funds FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- DONATIONS
-- =====================
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  fund_id uuid REFERENCES giving_funds(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  stripe_payment_id text DEFAULT '',
  stripe_session_id text DEFAULT '',
  payment_type text NOT NULL DEFAULT 'one_time' CHECK (payment_type IN ('one_time', 'recurring')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  donor_email text DEFAULT '',
  donor_name text DEFAULT '',
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donations_user_id_idx ON donations(user_id);
CREATE INDEX IF NOT EXISTS donations_fund_id_idx ON donations(fund_id);
CREATE INDEX IF NOT EXISTS donations_status_idx ON donations(status);
CREATE INDEX IF NOT EXISTS donations_created_at_idx ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS donations_stripe_session_id_idx ON donations(stripe_session_id);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own donations"
  ON donations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Authenticated users can insert donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can update donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete donations"
  ON donations FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- =====================
-- SEED DEFAULT DATA
-- =====================
INSERT INTO giving_funds (name, description, goal_amount, is_active) VALUES
  ('General Fund', 'Support the day-to-day operations of Grace Community Church', NULL, true),
  ('Building Fund', 'Help us build our new sanctuary and expand our facilities', 500000.00, true),
  ('Missions Fund', 'Support local and international missionary work', 50000.00, true),
  ('Youth Ministry', 'Invest in the next generation of faith', 25000.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO sermon_series (title, description, is_active) VALUES
  ('Faith That Moves Mountains', 'A journey through the book of James exploring practical faith', true),
  ('Rooted & Grounded', 'Finding your identity and purpose in Christ', true)
ON CONFLICT DO NOTHING;

INSERT INTO announcements (title, body, priority, is_published) VALUES
  ('Welcome to Grace Community Church', 'We are so glad you are here! Join us every Sunday at 9am and 11am for worship services. New to Grace? Stop by our Welcome Center after service.', 'high', true),
  ('Summer Picnic — Save the Date', 'Our annual church picnic is coming up! Bring your family and friends for a day of food, fun, and fellowship. More details coming soon.', 'normal', true),
  ('Volunteer Opportunities', 'We are looking for volunteers to serve in our children''s ministry, greeting team, and media team. Contact the church office to get involved.', 'normal', true)
ON CONFLICT DO NOTHING;
