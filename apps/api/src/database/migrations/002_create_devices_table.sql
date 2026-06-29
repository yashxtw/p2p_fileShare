-- 002_create_devices_table.sql
-- Anonymous device identification — no login required.
-- Devices are identified by a browser-generated fingerprint.
CREATE TABLE devices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_name   VARCHAR(255),
  browser       VARCHAR(100),
  platform      VARCHAR(100),
  os            VARCHAR(100),
  ip_address    INET,
  fingerprint   VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Fast lookup by fingerprint (used on every session create/join)
CREATE UNIQUE INDEX idx_devices_fingerprint ON devices(fingerprint);
-- Cleanup stale devices
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);