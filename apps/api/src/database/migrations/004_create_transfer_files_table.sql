-- 004_create_transfer_files_table.sql
-- Metadata for files to be transferred in a session.
-- Actual file data is sent over WebRTC (Phase 3) — this is metadata only.
CREATE TABLE transfer_files (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  file_name   VARCHAR(512) NOT NULL,
  file_size   BIGINT NOT NULL,
  mime_type   VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Look up files by session
CREATE INDEX idx_transfer_files_session ON transfer_files(session_id);
