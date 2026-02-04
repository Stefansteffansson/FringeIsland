# FringeIsland Feature Catalog Database

## Overview

`featuresDB.db` is a SQLite database containing a comprehensive, hierarchical catalog of all features implemented in the FringeIsland web application. This database is designed for easy searching, browsing, and documentation purposes.

## Database Statistics

- **Total Features:** 81
- **Categories:** 6 main categories
- **Hierarchy Depth:** Up to 3 levels (Category → Subcategory → Feature)
- **Status Tracking:** Completed, In-Progress, Planned, Deferred, Deprecated

## Features by Category

| Category | Completed | In-Progress | Planned | Total |
|----------|-----------|-------------|---------|-------|
| **Authentication** | 14 | - | - | 14 |
| **Pages** | 20 | - | - | 20 |
| **Groups** | 25 | - | - | 25 |
| **Journeys** | 13 | 1 | 1 | 15 |
| **UI Components** | 4 | - | - | 4 |
| **Database** | 3 | - | - | 3 |

## Database Schema

### Main Table: `features`

```sql
CREATE TABLE features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER,                   -- Hierarchical relationship
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL,                -- completed, in-progress, planned, etc.
  level INTEGER NOT NULL,              -- 0=root, 1=subcategory, 2=feature
  component_type TEXT,                 -- page, component, modal, form, etc.
  implementation_files TEXT,           -- JSON array of file paths
  required_role TEXT,
  required_permissions TEXT,           -- JSON array
  tech_stack TEXT,
  tags TEXT,                          -- JSON array for searching
  version_added TEXT,
  notes TEXT,
  ...
);
```

### Views

- **`v_root_features`** - All top-level categories
- **`v_completed_features`** - All completed features
- **`v_feature_stats`** - Feature count by category and status
- **`v_feature_hierarchy`** - Features with full breadcrumb path
- **`v_feature_children`** - Parent-child feature relationships

### Full-Text Search

The database includes a full-text search index (`features_fts`) for searching across:
- Feature names
- Descriptions
- Tags

## Usage Examples

### Using SQLite CLI

```bash
# Open the database
sqlite3 dev_databases/featuresDB.db

# View all root categories
SELECT * FROM v_root_features;

# Get feature statistics
SELECT * FROM v_feature_stats;

# View Groups category hierarchy
SELECT * FROM v_feature_hierarchy WHERE category='Groups';

# Search for features containing "authentication"
SELECT f.* FROM features f
JOIN features_fts fts ON f.id = fts.rowid
WHERE features_fts MATCH 'authentication';

# Find all features added in v0.2.10
SELECT name, category, component_type
FROM features
WHERE version_added = 'v0.2.10' AND status = 'completed';

# Get all children of a specific feature
SELECT * FROM v_feature_children WHERE parent_feature_id = 3;

# Find features by file path
SELECT name, category, implementation_files
FROM features
WHERE implementation_files LIKE '%InviteMemberModal%';

# List all Group Leader features
SELECT name, description, required_permissions
FROM features
WHERE required_role = 'Group Leader'
ORDER BY category, name;
```

### Using Node.js (better-sqlite3)

```javascript
const Database = require('better-sqlite3');
const db = new Database('dev_databases/featuresDB.db', { readonly: true });

// Get all completed features
const completed = db.prepare('SELECT * FROM v_completed_features').all();

// Search features
const search = db.prepare(`
  SELECT f.* FROM features f
  JOIN features_fts fts ON f.id = fts.rowid
  WHERE features_fts MATCH ?
`);
const results = search.all('journey enrollment');

// Get feature hierarchy
const hierarchy = db.prepare('SELECT * FROM v_feature_hierarchy WHERE category = ?').all('Journeys');

db.close();
```

### Using Python (sqlite3)

```python
import sqlite3
import json

conn = sqlite3.connect('dev_databases/featuresDB.db')
cursor = conn.cursor()

# Get all features with their hierarchy
cursor.execute('SELECT * FROM v_feature_hierarchy')
features = cursor.fetchall()

# Parse JSON fields
cursor.execute('SELECT name, tags FROM features WHERE tags IS NOT NULL')
for name, tags in cursor.fetchall():
    tag_list = json.loads(tags)
    print(f"{name}: {', '.join(tag_list)}")

conn.close()
```

## Rebuilding the Database

To regenerate the database with updated features:

```bash
cd dev_databases
node build_feature_database.js
```

This will:
1. Delete the existing database
2. Create a new database from `schema.sql`
3. Populate it with all features
4. Display statistics

## Querying Patterns

### Hierarchical Queries

```sql
-- Get all features under "Group Management"
WITH RECURSIVE feature_tree AS (
  SELECT * FROM features WHERE name = 'Group Management'
  UNION ALL
  SELECT f.* FROM features f
  INNER JOIN feature_tree ft ON f.parent_id = ft.id
)
SELECT * FROM feature_tree;
```

### Filtering by Status

```sql
-- Get all planned features
SELECT category, name, description
FROM features
WHERE status = 'planned'
ORDER BY category, name;

-- Get completion percentage by category
SELECT
  category,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 1) as completion_pct
FROM features
GROUP BY category;
```

### Component Analysis

```sql
-- Count features by component type
SELECT component_type, COUNT(*) as count
FROM features
WHERE component_type IS NOT NULL
GROUP BY component_type
ORDER BY count DESC;

-- Find all modal components
SELECT name, implementation_files
FROM features
WHERE component_type = 'modal';
```

## Schema Updates

The database tracks its own schema version:

```sql
SELECT * FROM schema_version;
```

Current version: **1.0.0**

## Notes

- **Hierarchical Structure**: Features are organized in a tree structure using `parent_id`
- **Searchable**: Full-text search index for quick text searches
- **Metadata-Rich**: Includes version info, file paths, permissions, tech stack
- **Self-Documenting**: Use the built-in views for common queries
- **JSON Fields**: Some fields store JSON arrays (parse with `JSON.parse()` in JavaScript or `json.loads()` in Python)

## Files

- `featuresDB.db` - The SQLite database file
- `schema.sql` - Database schema definition
- `build_feature_database.js` - Script to rebuild the database
- `README.md` - This documentation

## Maintenance

### Adding New Features

1. Edit `build_feature_database.js`
2. Add new `addFeature()` calls with appropriate hierarchy
3. Run `node build_feature_database.js` to rebuild

### Updating Existing Features

1. Edit the feature definition in `build_feature_database.js`
2. Rebuild the database

### Searching the Database

Use the full-text search for best results:

```sql
-- Search across name, description, and tags
SELECT f.name, f.category, f.description
FROM features f
JOIN features_fts fts ON f.id = fts.rowid
WHERE features_fts MATCH 'authentication OR login OR signup'
ORDER BY f.category, f.name;
```

---

**Last Updated:** 2026-02-04
**Version:** 1.0.0
**Total Features:** 81
