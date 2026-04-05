# Pre-D15 Schema Reference Export

**Exported:** 2026-02-22
**Purpose:** Reference of the schema state before D15 Universal Group Pattern rebuild
**Source:** Compiled from 71 migration files (20260120 through 20260221)

> Note: `supabase db dump` requires Docker Desktop (not available).
> This reference is compiled from all 71 migration files.

---

## Tables (18)

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_decommissioned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### permissions
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### role_templates
```sql
CREATE TABLE role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### group_templates
```sql
CREATE TABLE group_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### groups
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  label TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_from_group_template_id UUID REFERENCES group_templates(id) ON DELETE SET NULL,
  group_type TEXT NOT NULL DEFAULT 'engagement' CHECK (group_type IN ('system', 'personal', 'engagement')),
  is_public BOOLEAN DEFAULT false,
  show_member_list BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### group_memberships
```sql
CREATE TABLE group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'paused', 'removed')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id, member_group_id),
  CHECK ((user_id IS NOT NULL AND member_group_id IS NULL) OR (user_id IS NULL AND member_group_id IS NOT NULL))
);
```

### journeys
```sql
CREATE TABLE journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  journey_type TEXT NOT NULL DEFAULT 'predefined' CHECK (journey_type IN ('predefined', 'user_created', 'dynamic')),
  content JSONB,
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
```

### journey_enrollments
```sql
CREATE TABLE journey_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  enrolled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'frozen')),
  progress_data JSONB DEFAULT '{}',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  CHECK ((user_id IS NOT NULL AND group_id IS NULL) OR (user_id IS NULL AND group_id IS NOT NULL))
);
```

### role_template_permissions
```sql
CREATE TABLE role_template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(role_template_id, permission_id)
);
```

### group_template_roles
```sql
CREATE TABLE group_template_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_template_id UUID NOT NULL REFERENCES group_templates(id) ON DELETE CASCADE,
  role_template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  UNIQUE(group_template_id, role_template_id)
);
```

### group_roles
```sql
CREATE TABLE group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_from_role_template_id UUID REFERENCES role_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, name)
);
```

### group_role_permissions
```sql
CREATE TABLE group_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_role_id UUID NOT NULL REFERENCES group_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_role_id, permission_id)
);
```

### user_group_roles
```sql
CREATE TABLE user_group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  group_role_id UUID NOT NULL REFERENCES group_roles(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_id, group_role_id)
);
```

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### forum_posts
```sql
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  participant_1_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  participant_2_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2),
  CHECK (participant_1 < participant_2),
  CHECK (participant_1 != participant_2)
);
```

### direct_messages
```sql
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### admin_audit_log
```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Key Column Rename Map (D15 Changes)

| Table | Old Column | New Column |
|---|---|---|
| group_memberships | user_id | DROPPED (use member_group_id only) |
| group_memberships | added_by_user_id | added_by_group_id |
| user_group_roles | user_id | member_group_id |
| user_group_roles | assigned_by_user_id | assigned_by_group_id |
| journey_enrollments | user_id | DROPPED (personal group uses group_id) |
| journey_enrollments | enrolled_by_user_id | enrolled_by_group_id |
| forum_posts | author_user_id | author_group_id |
| direct_messages | sender_id | sender_group_id |
| conversations | participant_1/2 | same names, FK → groups(id) |
| groups | created_by_user_id | created_by_group_id |
| journeys | created_by_user_id | created_by_group_id |
| notifications | recipient_user_id | recipient_group_id |
| admin_audit_log | actor_user_id | actor_group_id |
| users | (new) | personal_group_id → groups(id) |

---

## Indexes (as of last migration)

- idx_groups_group_type ON groups(group_type)
- idx_memberships_user_group_status ON group_memberships(user_id, group_id, status)
- idx_ugr_user_group_role ON user_group_roles(user_id, group_id, group_role_id)
- Various notification, forum, DM indexes (see migration files)

---

## Functions (38 total, see migration files for full definitions)

Key functions:
- get_current_user_profile_id() — returns users.id for current auth user
- has_permission(user_id, group_id, permission_name) — RBAC permission check
- get_user_permissions(user_id, group_id) — returns all permissions
- handle_new_user() — auth.users INSERT trigger
- handle_user_deletion() — auth.users DELETE trigger (soft delete)
- admin_hard_delete_user() — SECURITY DEFINER RPC
- admin_force_logout() — SECURITY DEFINER RPC
- admin_send_notification() — SECURITY DEFINER RPC
- get_group_member_counts() — performance RPC

## Migration Count: 71
## Total permissions: 39 (38 original + manage_roles)
