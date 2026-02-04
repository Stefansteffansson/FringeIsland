# Database Update Instructions

**Version:** 1.1
**Date:** February 4, 2026

## Apply Schema Update

The schema update adds `sessions` and `migrations_applied` tables for better project tracking.

### Method 1: Using sqlite3 CLI
```bash
cd dev_databases
sqlite3 featuresDB.db < schema_update_v1.1.sql
```

### Method 2: Using DB Browser for SQLite
1. Open `featuresDB.db` in DB Browser for SQLite
2. Go to "Execute SQL" tab
3. Open and run `schema_update_v1.1.sql`

### Method 3: Using Node.js
```bash
cd dev_databases
node -e "
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('./featuresDB.db');
const sql = fs.readFileSync('./schema_update_v1.1.sql', 'utf8');
db.exec(sql, (err) => {
  if (err) console.error(err);
  else console.log('Schema updated successfully!');
  db.close();
});
"
```

## Verify Update

After applying, verify tables were created:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sessions', 'migrations_applied');
```

Should return:
- sessions
- migrations_applied

Check migration seed data:
```sql
SELECT COUNT(*) FROM migrations_applied;
```

Should return: 10

## What Was Added

### sessions Table
- Tracks work sessions for continuity
- Links to session bridge documents
- Records features completed, decisions made
- Useful for "what did we work on?" queries

### migrations_applied Table
- Tracks Supabase migrations
- Pre-seeded with 10 existing migrations
- Helps understand schema evolution
- Useful for "when was X added?" queries

## Usage Examples

### Record a session
```sql
INSERT INTO sessions (date, version, focus, summary, bridge_file)
VALUES ('2026-02-04', 'v0.2.10', 'Documentation Restructuring',
        'Complete reorganization of project docs',
        'docs/planning/sessions/2026-02-04-restructuring.md');
```

### View recent sessions
```sql
SELECT * FROM v_recent_sessions;
```

### Check which migrations are applied
```sql
SELECT migration_number, description, version, applied_date
FROM v_migration_history;
```

### Find migrations for a version
```sql
SELECT * FROM migrations_applied WHERE version = 'v0.2.10';
```

---

**After applying this update, the database will be at schema version 1.1.0**
