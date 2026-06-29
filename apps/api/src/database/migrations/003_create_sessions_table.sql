-- 003_create_sessions_table.sql
-- Core session table — represents a single transfer session between two devices.
--
-- The session_code is a 6-digit numeric code for the receiver to join.
-- We use a PARTIAL UNIQUE INDEX so codes are only unique among active sessions,
-- allowing expired/completed codes to be reused (important with only 1M combinations).
CREATE TABLE sessions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_code       VARCHAR(6) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'WAITING',
  sender_device_id   UUID NOT NULL REFERENCES devices(id),
  receiver_device_id UUID REFERENCES devices(id),
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Partial unique index: session codes are unique only among active sessions
CREATE UNIQUE INDEX idx_sessions_code_active
  ON sessions(session_code)
  WHERE status NOT IN ('COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');
-- Query active sessions by status
CREATE INDEX idx_sessions_status ON sessions(status);
-- Find sessions that need to be expired (cron cleanup)
CREATE INDEX idx_sessions_expires_at
  ON sessions(expires_at)
  WHERE status = 'WAITING';
-- Look up sessions by device
CREATE INDEX idx_sessions_sender ON sessions(sender_device_id);
CREATE INDEX idx_sessions_receiver ON sessions(receiver_device_id);