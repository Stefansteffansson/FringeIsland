-- ============================================
-- FringeIsland Feature Catalog Database Schema
-- SQLite Database for hierarchical feature documentation
-- Version: 1.0
-- Date: 2026-02-04
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- Features Table (Hierarchical)
-- ============================================
CREATE TABLE features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES features(id) ON DELETE CASCADE,

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,  -- e.g., 'Authentication', 'Groups', 'Journeys', 'UI', 'Database'

  -- Status and Priority
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in-progress', 'planned', 'deferred', 'deprecated')),
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Versioning
  version_added TEXT,  -- e.g., 'v0.2.6', 'v0.2.10'
  version_deprecated TEXT,

  -- Implementation Details
  implementation_files TEXT,  -- JSON array of file paths
  component_type TEXT CHECK (component_type IN ('page', 'component', 'modal', 'form', 'api', 'database', 'trigger', 'policy', 'utility', 'hook')),

  -- Technical Details
  tech_stack TEXT,  -- e.g., 'Next.js', 'React', 'Supabase', 'PostgreSQL'
  dependencies TEXT,  -- JSON array of feature IDs this depends on

  -- Access Control
  required_role TEXT,  -- e.g., 'Group Leader', 'Member', 'Any authenticated user', 'Public'
  required_permissions TEXT,  -- JSON array of permission names

  -- Metadata
  tags TEXT,  -- JSON array of tags for searching
  notes TEXT,  -- Additional notes or caveats
  documentation_url TEXT,  -- Link to docs or specs

  -- Hierarchy metadata
  level INTEGER NOT NULL DEFAULT 0,  -- 0 = root, 1 = child, 2 = grandchild, etc.
  sort_order INTEGER DEFAULT 0,  -- For custom ordering within a level

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast queries
CREATE INDEX idx_features_parent ON features(parent_id);
CREATE INDEX idx_features_category ON features(category);
CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_features_level ON features(level);
CREATE INDEX idx_features_name ON features(name);

-- Full-text search index
CREATE VIRTUAL TABLE features_fts USING fts5(
  name,
  description,
  tags,
  content=features,
  content_rowid=id
);

-- Trigger to keep FTS index in sync
CREATE TRIGGER features_fts_insert AFTER INSERT ON features
BEGIN
  INSERT INTO features_fts(rowid, name, description, tags)
  VALUES (new.id, new.name, new.description, new.tags);
END;

CREATE TRIGGER features_fts_update AFTER UPDATE ON features
BEGIN
  UPDATE features_fts
  SET name = new.name, description = new.description, tags = new.tags
  WHERE rowid = new.id;
END;

CREATE TRIGGER features_fts_delete AFTER DELETE ON features
BEGIN
  DELETE FROM features_fts WHERE rowid = old.id;
END;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_features_timestamp
AFTER UPDATE ON features
FOR EACH ROW
BEGIN
  UPDATE features SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- Views for Common Queries
-- ============================================

-- View: All root-level features (no parent)
CREATE VIEW v_root_features AS
SELECT * FROM features
WHERE parent_id IS NULL
ORDER BY category, sort_order, name;

-- View: All completed features
CREATE VIEW v_completed_features AS
SELECT * FROM features
WHERE status = 'completed'
ORDER BY category, level, name;

-- View: Feature count by category
CREATE VIEW v_feature_stats AS
SELECT
  category,
  status,
  COUNT(*) as count
FROM features
GROUP BY category, status
ORDER BY category, status;

-- View: Feature hierarchy with path (breadcrumb)
CREATE VIEW v_feature_hierarchy AS
WITH RECURSIVE feature_path AS (
  -- Base case: root features
  SELECT
    id,
    parent_id,
    name,
    category,
    status,
    level,
    name as path
  FROM features
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive case: child features
  SELECT
    f.id,
    f.parent_id,
    f.name,
    f.category,
    f.status,
    f.level,
    fp.path || ' > ' || f.name as path
  FROM features f
  INNER JOIN feature_path fp ON f.parent_id = fp.id
)
SELECT * FROM feature_path
ORDER BY path;

-- ============================================
-- Helper Functions (via Views)
-- ============================================

-- View: Get all child features for each feature
CREATE VIEW v_feature_children AS
SELECT
  p.id as parent_feature_id,
  p.name as parent_name,
  c.id as child_feature_id,
  c.name as child_name,
  c.status as child_status,
  c.level as child_level
FROM features p
LEFT JOIN features c ON p.id = c.parent_id
WHERE c.id IS NOT NULL
ORDER BY p.id, c.sort_order, c.name;

-- ============================================
-- Schema Version Tracking
-- ============================================
CREATE TABLE schema_version (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT
);

INSERT INTO schema_version (version, description)
VALUES ('1.0.0', 'Initial feature catalog schema');

-- ============================================
-- Sample Queries (commented out)
-- ============================================

-- Find all features by category:
-- SELECT * FROM features WHERE category = 'Authentication' ORDER BY level, name;

-- Search features by text:
-- SELECT f.* FROM features f
-- JOIN features_fts fts ON f.id = fts.rowid
-- WHERE features_fts MATCH 'login OR signup';

-- Get feature hierarchy:
-- SELECT * FROM v_feature_hierarchy WHERE category = 'Groups';

-- Get all child features:
-- SELECT * FROM v_feature_children WHERE parent_feature_id = 1;

-- Feature statistics:
-- SELECT * FROM v_feature_stats;

-- Find features by file:
-- SELECT * FROM features
-- WHERE implementation_files LIKE '%InviteMemberModal%';

-- Get completed features added in specific version:
-- SELECT * FROM features
-- WHERE version_added = 'v0.2.10' AND status = 'completed';
