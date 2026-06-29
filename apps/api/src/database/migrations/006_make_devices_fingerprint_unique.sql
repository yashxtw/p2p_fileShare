-- 006_make_devices_fingerprint_unique.sql
-- Add unique constraint/index to fingerprint in devices table.
-- This is required for INSERT ... ON CONFLICT (fingerprint) DO UPDATE to work.

DROP INDEX IF EXISTS idx_devices_fingerprint;
CREATE UNIQUE INDEX idx_devices_fingerprint ON devices(fingerprint);
