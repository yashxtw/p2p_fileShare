-- 005_create_audit_logs_table.sql
-- Immutable audit trail for all session events.
-- Uses JSONB metadata for flexible event-specific data.
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
  event_type  VARCHAR(50) NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Look up logs by session
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id);
-- Filter by event type
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
-- Time-range queries
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);