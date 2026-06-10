-- DEFECT-003: Audit logging for SOC2 + GDPR compliance
-- Tracks all sensitive operations: user management, payments, subscription changes

CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     uuid        REFERENCES churches(id) ON DELETE SET NULL,
  actor_id      uuid,                          -- auth.users id of who did it
  actor_email   text,
  actor_role    text,
  action        text        NOT NULL,          -- 'user.approve', 'user.suspend', 'subscription.create'
  resource_type text        NOT NULL,          -- 'user', 'subscription', 'donation', 'group'
  resource_id   text,                          -- UUID of the affected record
  old_values    jsonb,                         -- state before change
  new_values    jsonb,                         -- state after change
  ip_address    text,
  user_agent    text,
  created_at    timestamptz DEFAULT now()
);

-- Indexes for compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_church_time
  ON audit_logs(church_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON audit_logs(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_resource
  ON audit_logs(resource_type, resource_id);

-- RLS: Only admins can read audit logs; only service role can write
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read their church audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@taborsynergy.com'
    OR (
      church_id = (
        SELECT church_id FROM users WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- No INSERT/UPDATE/DELETE via RLS — only service_role can write audit logs
