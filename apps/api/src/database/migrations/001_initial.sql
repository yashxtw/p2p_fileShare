-- 001_initial.sql
-- Creates the migrations tracking table and sets up extensions.
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- The _migrations table itself is created by the migration runner,
-- but we include it here for documentation completeness.
-- Verify setup
SELECT NOW() AS migration_timestamp, current_database() AS database_name;
