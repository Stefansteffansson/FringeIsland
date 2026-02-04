# Quick Start Guide - FringeIsland Feature Catalog

## 🎯 What is this?

A **searchable SQLite database** containing all 81 features of FringeIsland, organized hierarchically by category.

## 🆕 CRUD Manager - Add/Edit/Delete Features!

```bash
cd dev_databases
node manage_features.js
```

**Interactive menu for:**
- ✅ Creating new features
- 🔍 Searching/viewing features
- ✏️ Updating features
- 🗑️ Deleting features
- 📊 Viewing statistics

See `CRUD_GUIDE.md` for detailed usage instructions.

## 🚀 Quick Access

### View in Database Browser

Download [DB Browser for SQLite](https://sqlitebrowser.org/) and open `featuresDB.db`

### Command Line Queries

```bash
# Navigate to database directory
cd dev_databases

# View all root categories
sqlite3 featuresDB.db "SELECT name, category, status FROM v_root_features;"

# Search for "enrollment" features
sqlite3 featuresDB.db "SELECT f.name, f.category FROM features f JOIN features_fts fts ON f.id = fts.rowid WHERE features_fts MATCH 'enrollment';"

# Get feature statistics
sqlite3 featuresDB.db "SELECT * FROM v_feature_stats;"

# View Groups category hierarchy
sqlite3 featuresDB.db "SELECT * FROM v_feature_hierarchy WHERE category='Groups';"
```

### Quick Searches

```sql
-- All Group Leader features
SELECT name, description FROM features WHERE required_role = 'Group Leader';

-- Features added in v0.2.10
SELECT name, category FROM features WHERE version_added = 'v0.2.10';

-- All modal components
SELECT name, implementation_files FROM features WHERE component_type = 'modal';

-- Planned features (not yet implemented)
SELECT name, category, notes FROM features WHERE status = 'planned';
```

## 📊 Database Overview

```
📁 dev_databases/
├── featuresDB.db                  # The database (81 features)
├── schema.sql                     # Database schema
├── build_feature_database.js      # Rebuild script
├── README.md                      # Full documentation
└── QUICK_START.md                 # This file
```

## 🔍 Feature Hierarchy

```
Level 0: Root Categories (6)
  └─ Level 1: Subcategories (17)
      └─ Level 2: Individual Features (58)
```

### Categories:
1. **Pages & Routes** (20 features)
2. **Authentication System** (14 features)
3. **Group Management** (25 features)
4. **Journey System** (15 features) - 85% complete
5. **UI Components** (4 features)
6. **Database Architecture** (3 features)

## 🛠️ Common Tasks

### Rebuild Database
```bash
cd dev_databases
node build_feature_database.js
```

### Search for a Feature
```bash
sqlite3 featuresDB.db "SELECT name, category, description FROM features WHERE name LIKE '%invite%';"
```

### Get All Children of a Feature
```bash
sqlite3 featuresDB.db "SELECT * FROM v_feature_children WHERE parent_name = 'Group Management';"
```

### Export to CSV
```bash
sqlite3 -header -csv featuresDB.db "SELECT * FROM features;" > features.csv
```

## 📖 Key Tables

- `features` - Main table with all features
- `features_fts` - Full-text search index
- `v_root_features` - View of top-level categories
- `v_feature_hierarchy` - View with breadcrumb paths
- `v_feature_stats` - Statistics by category and status

## 💡 Pro Tips

1. **Use FTS for text search**: Much faster than LIKE queries
   ```sql
   SELECT f.* FROM features f
   JOIN features_fts fts ON f.id = fts.rowid
   WHERE features_fts MATCH 'your search term';
   ```

2. **Filter by hierarchy level**:
   - `level = 0` → Root categories
   - `level = 1` → Subcategories
   - `level = 2` → Individual features

3. **JSON fields**: Parse with `JSON.parse()` (JavaScript) or `json.loads()` (Python)
   - `implementation_files`
   - `required_permissions`
   - `tags`

4. **View feature breadcrumb**: Use `v_feature_hierarchy` view for full path

## 🎓 Example Queries

### Find All Group-Related Features
```sql
SELECT name, description, component_type
FROM features
WHERE category = 'Groups' AND level = 2
ORDER BY name;
```

### Completion Status by Category
```sql
SELECT
  category,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
FROM features
WHERE level = 2  -- Only count actual features, not categories
GROUP BY category;
```

### Features Requiring Group Leader Role
```sql
SELECT name, category, required_permissions
FROM features
WHERE required_role = 'Group Leader'
ORDER BY category;
```

---

**Database Location:** `D:\WebDev\GitHub Repositories\FringeIsland\dev_databases\featuresDB.db`

For detailed documentation, see `README.md`
