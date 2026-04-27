/*
  # Rate Limits Table

  Provides a distributed rate-limiting store safe for serverless environments.
  Used by lib/security/rate-limiter.ts checkRateLimit().

  Rows are short-lived (TTL-based cleanup happens inline during requests).
  Index on (key, requested_at) supports the windowed COUNT query efficiently.
*/

CREATE TABLE IF NOT EXISTS rate_limits (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_key_requested_at_idx
  ON rate_limits (key, requested_at DESC);

-- Only the service role should touch this table; no RLS needed for server-only access
-- but enable it defensively so anon/authenticated clients cannot read/write directly
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies = deny all non-service-role access
