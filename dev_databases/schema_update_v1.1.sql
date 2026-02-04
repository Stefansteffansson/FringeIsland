-- ============================================
-- FringeIsland Feature Database - Schema Update v1.1
-- Adds session tracking and migration tracking
-- Version: 1.1
-- Date: 2026-02-04
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- Sessions Table
-- Track work sessions for continuity
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Session Info
  date TEXT NOT NULL,  -- YYYY-MM-DD format
  duration_hours REAL,  -- Approximate duration
  version TEXT,  -- Project version during session (e.g., 'v0.2.10')

  -- Summary
  summary TEXT NOT NULL,  -- Brief description of work done
  focus TEXT,  -- Main focus area (e.g., 'Journey System', 'Documentation Restructuring')

  -- Documentation
  bridge_file TEXT,  -- Path to session bridge document (if created)

  -- Changes
  files_modified TEXT,  -- JSON array of file paths
  features_completed TEXT,  -- JSON array of feature IDs that were completed

  -- Decisions & Notes
  key_decisions TEXT,  -- JSON array of important decisions
  issues_discovered TEXT,  -- JSON array of issues found
  blockers TEXT,  -- JSON array of blocking issues

  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT  -- Additional notes
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_version ON sessions(version);

-- ============================================
-- Migrations Applied Table
-- Track which database migrations have been applied
-- ============================================
CREATE TABLE IF NOT EXISTS migrations_applied (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Migration Info
  migration_number INTEGER UNIQUE NOT NULL,  -- Sequential number (1, 2, 3, ...)
  migration_file TEXT NOT NULL,  -- Filename (e.g., '20260120_initial_schema.sql')
  description TEXT NOT NULL,  -- Brief description

  -- Dates
  applied_date TEXT NOT NULL DEFAULT (date('now')),  -- When migration was applied

  -- Details
  version TEXT,  -- Project version (e.g., 'v0.2.0')
  tables_affected TEXT,  -- JSON array of table names
  notes TEXT,  -- Any important notes about this migration

  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_migrations_number ON migrations_applied(migration_number);
CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations_applied(version);

-- ============================================
-- Views for Sessions
-- ============================================

-- View: Recent sessions
CREATE VIEW IF NOT EXISTS v_recent_sessions AS
SELECT
  id,
  date,
  version,
  focus,
  summary,
  bridge_file,
  duration_hours
FROM sessions
ORDER BY date DESC
LIMIT 10;

-- View: Sessions by version
CREATE VIEW IF NOT EXISTS v_sessions_by_version AS
SELECT
  version,
  COUNT(*) as session_count,
  SUM(duration_hours) as total_hours,
  MIN(date) as first_session,
  MAX(date) as last_session
FROM sessions
WHERE version IS NOT NULL
GROUP BY version
ORDER BY last_session DESC;

-- ============================================
-- Views for Migrations
-- ============================================

-- View: Migration history
CREATE VIEW IF NOT EXISTS v_migration_history AS
SELECT
  migration_number,
  migration_file,
  description,
  version,
  applied_date
FROM migrations_applied
ORDER BY migration_number;

-- View: Migrations by version
CREATE VIEW IF NOT EXISTS v_migrations_by_version AS
SELECT
  version,
  COUNT(*) as migration_count,
  MIN(applied_date) as first_migration,
  MAX(applied_date) as last_migration
FROM migrations_applied
WHERE version IS NOT NULL
GROUP BY version
ORDER BY first_migration;

-- ============================================
-- Update Schema Version
-- ============================================
INSERT INTO schema_version (version, description)
VALUES ('1.1.0', 'Added sessions and migrations_applied tables for project tracking');

-- ============================================
-- Seed Initial Migration Data (10 known migrations)
-- ============================================
INSERT INTO migrations_applied (migration_number, migration_file, description, version, applied_date, notes) VALUES
(1, '20260120_initial_schema.sql', 'Initial schema with 13 tables', 'v0.2.0', '2026-01-20', 'Foundation schema'),
(2, '20260123_fix_user_trigger_and_rls.sql', 'User lifecycle fixes', 'v0.2.1', '2026-01-23', 'Auto-create profile, soft delete'),
(3, '20260125_update_group_memberships_rls.sql', 'Group memberships RLS', 'v0.2.3', '2026-01-25', 'Invitation system RLS'),
(4, '20260125_add_status_constraint.sql', 'Status constraint', 'v0.2.3', '2026-01-25', 'Enforce valid status values'),
(5, '20260125_update_members_policies.sql', 'Member management policies', 'v0.2.5', '2026-01-25', 'Leave, remove, accept'),
(6, '20260126_role_management_policies.sql', 'Role management policies', 'v0.2.6', '2026-01-26', 'Assign and remove roles'),
(7, '20260126_last_leader_protection.sql', 'Last leader protection', 'v0.2.6.2', '2026-01-26', 'Prevent removing last leader'),
(8, '20260126_invitation_policies.sql', 'Invitation policies', 'v0.2.7', '2026-01-26', 'Email-based invitations'),
(9, '20260127_seed_predefined_journeys.sql', 'Predefined journeys', 'v0.2.8', '2026-01-27', '8 journeys seeded'),
(10, '20260131_fix_journey_enrollment_rls.sql', 'Journey enrollment RLS fix', 'v0.2.10', '2026-01-31', 'Fixed infinite recursion');

-- ============================================
-- Sample Queries (commented out)
-- ============================================

-- Get recent sessions:
-- SELECT * FROM v_recent_sessions;

-- Get sessions for specific version:
-- SELECT * FROM sessions WHERE version = 'v0.2.10';

-- Get session by date:
-- SELECT * FROM sessions WHERE date = '2026-02-04';

-- Get all migrations:
-- SELECT * FROM v_migration_history;

-- Get migrations for specific version:
-- SELECT * FROM migrations_applied WHERE version = 'v0.2.10';

-- Check which migrations are applied:
-- SELECT migration_number, description, applied_date FROM migrations_applied ORDER BY migration_number;

-- Get work done in last 7 days:
-- SELECT date, focus, summary FROM sessions
-- WHERE date >= date('now', '-7 days')
-- ORDER BY date DESC;

-- ============================================
-- Verification
-- ============================================

-- Verify tables created
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sessions', 'migrations_applied');

-- Verify migration seed data
SELECT COUNT(*) as migration_count FROM migrations_applied;
