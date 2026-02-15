# Database Agent Context

**Purpose:** Context for database schema changes, migrations, and RLS policies
**For:** Adding tables, modifying schema, creating migrations, updating RLS
**Last Updated:** February 4, 2026

---

## 🎯 Quick Reference

**Database:** PostgreSQL 15+ via Supabase
**Total Tables:** 13
**ORM:** Supabase Client (not Prisma/TypeORM)
**Security:** Row Level Security (RLS) on all tables
**Migrations:** Manual SQL files in `supabase/migrations/`

---

## 📊 Current Schema

### Core Tables (13)
```
users                      # User profiles (soft delete via is_active)
permissions                # System capabilities (40 seeded)
role_templates             # Role blueprints (5 seeded)
group_templates            # Group blueprints (4 seeded)
groups                     # Organizational units
group_memberships          # User-group relationships (status: active/invited/paused/removed)
journeys                   # Learning experiences (content as JSONB)
journey_enrollments        # Participation tracking (individual OR group)
role_template_permissions  # Role-permission mappings
group_template_roles       # Template-role mappings
group_roles                # Group-specific roles
group_role_permissions     # Role permissions
user_group_roles           # User role assignments (last leader protection trigger)
```

**Full schema:** `docs/database/schema-overview.md`

---

## 🔑 Key Patterns

### Foreign Key Conventions
```sql
-- Always reference primary key (id)
group_id UUID REFERENCES groups(id)
user_id UUID REFERENCES users(id)
created_by_user_id UUID REFERENCES users(id)

-- ON DELETE behavior:
-- - CASCADE: When parent deleted, delete child (use sparingly)
-- - RESTRICT: Prevent parent deletion if children exist (default)
-- - SET NULL: Set foreign key to NULL (for nullable fields)

-- User references: Usually RESTRICT or SET NULL (preserve history)
-- Auth references: CASCADE (cleanup on account deletion)
```

### JSONB Fields
```sql
-- Use for flexible data structures
settings JSONB DEFAULT '{}'::jsonb
content JSONB NOT NULL
progress_data JSONB DEFAULT '{}'::jsonb

-- Query JSONB:
SELECT * FROM groups WHERE settings->>'theme' = 'dark';
SELECT * FROM journeys WHERE content->'steps' @> '[{"type": "assessment"}]';
```

### Timestamps
```sql
-- Standard pattern:
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- Auto-update trigger:
CREATE TRIGGER update_[table]_updated_at
  BEFORE UPDATE ON [table]
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Soft Delete Pattern
```sql
-- Don't use deleted_at, use is_active
is_active BOOLEAN NOT NULL DEFAULT true

-- Index for performance:
CREATE INDEX idx_[table]_active ON [table](is_active) WHERE is_active = true;

-- Queries always filter:
SELECT * FROM users WHERE is_active = true;
```

---

## 🔒 RLS Policy Patterns

### Enable RLS (always required)
```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
```

### Common Policy Patterns

**Own data access:**
```sql
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = auth_user_id);
```

**Group member access:**
```sql
CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_memberships
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND status = 'active'
    )
  );
```

**Leader-only actions:**
```sql
CREATE POLICY "Leaders can manage their groups"
  ON groups FOR UPDATE
  USING (
    id IN (
      SELECT ugr.group_id FROM user_group_roles ugr
      JOIN group_roles gr ON ugr.group_role_id = gr.id
      WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND gr.name = 'Group Leader'
    )
  );
```

**Public data:**
```sql
CREATE POLICY "Anyone can view public groups"
  ON groups FOR SELECT
  USING (is_public = true);
```

### RLS Best Practices
- ✅ Keep policies simple (avoid nested subqueries with browser client)
- ✅ Use EXISTS over IN for large datasets
- ✅ Index columns used in policies
- ❌ Don't create recursive policies (causes infinite loops)
- ❌ Don't use complex joins in RLS (performance hit)
- ✅ Move complex authorization to application layer if needed

---

## 🛠️ Trigger Patterns

### Update Timestamp
```sql
CREATE TRIGGER update_[table]_updated_at
  BEFORE UPDATE ON [table]
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Auto-create Related Records
```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (auth_user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

### Business Rule Enforcement
```sql
CREATE OR REPLACE FUNCTION prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  remaining_leaders INTEGER;
BEGIN
  -- Count remaining leaders after this deletion
  SELECT COUNT(*) INTO remaining_leaders
  FROM user_group_roles ugr
  JOIN group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
  AND gr.name = 'Group Leader'
  AND ugr.id != OLD.id;

  IF remaining_leaders = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Group Leader from the group';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_last_leader_removal
  BEFORE DELETE ON user_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_leader_removal();
```

---

## 📝 Migration Workflow

### 0. Verify Failing Tests Exist (HARD GATE)

**Before creating ANY migration, verify:**
- [ ] Behavior specs exist for this feature
- [ ] Integration tests are written
- [ ] Tests have been run and confirmed to FAIL (RED)

**If missing → STOP. Hand back to Test Agent. Do NOT create the migration.**

### 1. Create Migration File
**Naming:** `YYYYMMDD_descriptive_name.sql`
**Location:** `supabase/migrations/`

```sql
-- Migration: Add notifications table
-- Date: 2026-02-05
-- Version: 0.2.11

-- Create table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Verify
SELECT COUNT(*) FROM notifications;
```

### 2. Test Migration
- Run in Supabase SQL editor
- Test RLS policies as different users
- Verify indexes created
- Check foreign keys work

### 3. Run Integration Tests (Confirm GREEN)
- Run `npm run test:integration` — previously failing tests should now pass
- If tests still fail, fix the migration before proceeding
- This confirms the migration correctly implements the designed behavior

### 4. Update Documentation
- Add entry to `docs/database/migrations-log.md`
- Update `docs/database/schema-overview.md` if new table
- Update `docs/database/rls-policies.md` if new policies

---

## 🔍 Supabase Client Patterns

### Browser Client (`lib/supabase/client.ts`)
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Simple query
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// With foreign keys
const { data } = await supabase
  .from('group_memberships')
  .select(`
    id,
    status,
    users (full_name, avatar_url),
    groups (name)
  `)
  .eq('group_id', groupId);

// With filters
const { data } = await supabase
  .from('journeys')
  .select('*')
  .eq('is_published', true)
  .in('difficulty_level', ['beginner', 'intermediate'])
  .order('created_at', { ascending: false });
```

### Common Gotchas

**❌ DON'T: Subqueries in .in()**
```typescript
// This doesn't work with browser client:
.in('group_id', supabase.from('group_memberships').select('group_id'))
```

**✅ DO: Fetch IDs first**
```typescript
// Fetch IDs first:
const { data: memberships } = await supabase
  .from('group_memberships')
  .select('group_id')
  .eq('user_id', userId);

const groupIds = memberships?.map(m => m.group_id) || [];

// Then use array:
.in('group_id', groupIds)
```

**Foreign Key Data Mapping:**
```typescript
// Supabase returns plural (table name):
{ journeys: {...}, groups: {...} }

// Component expects singular:
{ journey: {...}, group: {...} }

// Map it:
const mapped = data.map(e => ({
  ...e,
  journey: e.journeys,
  group: e.groups
}));
```

---

## 📐 Schema Design Principles

### Normalization
- ✅ Use junction tables for many-to-many (e.g., user_group_roles)
- ✅ Foreign keys for relationships
- ✅ Avoid data duplication
- ❌ Don't over-normalize (use JSONB for flexible data)

### Naming Conventions
- Tables: plural, lowercase, underscore (e.g., `group_memberships`)
- Columns: singular, lowercase, underscore (e.g., `user_id`)
- Foreign keys: `[table]_id` (e.g., `group_id`)
- Booleans: `is_`, `has_`, `can_` (e.g., `is_active`)
- Timestamps: `_at` suffix (e.g., `created_at`)
- Junction tables: `[table1]_[table2]` (e.g., `user_group_roles`)

### Indexes
```sql
-- Foreign keys (always):
CREATE INDEX idx_[table]_[column] ON [table]([column]);

-- Composite indexes (for common queries):
CREATE INDEX idx_memberships_user_status ON group_memberships(user_id, status);

-- Partial indexes (for filtered queries):
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- JSONB indexes (for JSON queries):
CREATE INDEX idx_journeys_tags ON journeys USING GIN(tags);
```

---

## 🧪 Testing Database Changes

### RLS Testing
```sql
-- Switch to test user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "[user-uuid]"}';

-- Try queries
SELECT * FROM groups; -- Should only see user's groups

-- Reset
RESET ROLE;
```

### Trigger Testing
```sql
-- Test auto-create
INSERT INTO auth.users (email) VALUES ('test@example.com');
SELECT * FROM users WHERE email = 'test@example.com'; -- Should exist

-- Test validation
DELETE FROM user_group_roles WHERE id = '[last-leader-id]'; -- Should fail
```

---

## 📚 Related Documentation

- **Schema overview:** `docs/database/schema-overview.md`
- **Migration log:** `docs/database/migrations-log.md`
- **Full schema SQL:** `docs/architecture/DATABASE_SCHEMA.md`
- **Authorization:** `docs/architecture/AUTHORIZATION.md`

---

## ⚠️ Common Mistakes

1. **Forgetting RLS** → Always enable RLS on new tables
2. **Complex RLS policies** → Keep simple, move logic to app layer
3. **Missing indexes** → Index foreign keys and filter columns
4. **Wrong ON DELETE** → Choose CASCADE vs RESTRICT carefully
5. **Not testing as different users** → RLS bugs hide in production
6. **Subqueries in .in()** → Fetch IDs first with browser client
7. **Forgetting to update docs** → Keep docs in sync with schema

---

## Boundaries

### I Do
- Write migration SQL (tables, columns, constraints, indexes)
- Design and implement RLS policies
- Create triggers and database functions
- Implement seed data
- Maintain schema documentation

### I Don't (hand off to)
- **Design system architecture** → Architect Agent
- **Write Supabase queries in components** → Integration Agent
- **Build UI** → UI Agent
- **Write tests** → Test Agent
- **Review finished work** → QA/Review Agent

### I Collaborate With
- **Architect Agent:** They design the schema; I implement the migration
- **Integration Agent:** I define the tables; they write queries against them
- **Test Agent:** They write failing tests FIRST; I create migrations to make those tests pass

---

## Learning Protocol

When working in this domain:
1. Check `docs/agents/learnings/database.md` for recent discoveries
2. During work, append new findings to the journal
3. At close-down, flag any cross-cutting learnings for MEMORY.md

Journal location: `docs/agents/learnings/database.md`
Last curated: 2026-02-13 (initial)

---

**For database work, you have everything you need in this context. Load specific migration files or feature docs only if needed.**
