# Database Schema Overview

**Version:** 0.2.10
**Last Updated:** February 4, 2026
**Database:** PostgreSQL via Supabase

This document provides a high-level overview of the FringeIsland database schema. For complete SQL definitions, see `docs/architecture/DATABASE_SCHEMA.md`.

---

## 📊 Schema Summary

**Total Tables:** 13
**Total Migrations:** 10 applied
**RLS Status:** Enabled on all tables

---

## 🗺️ Schema Structure

```
Core Tables (13):
├── users                      # User accounts and profiles
├── permissions                # Atomic capabilities (40 seeded)
├── role_templates             # Role blueprints (5 seeded)
├── group_templates            # Group blueprints (4 seeded)
├── groups                     # Organizational units
├── group_memberships          # User-group relationships
├── journeys                   # Learning experience definitions
├── journey_enrollments        # Journey participation tracking
├── role_template_permissions  # Role-permission mappings
├── group_template_roles       # Template-role mappings
├── group_roles                # Group-specific role instances
├── group_role_permissions     # Group role permissions
└── user_group_roles           # User role assignments

Future Tables (Phase 2+):
├── forum_posts               # Group discussions
├── messages                  # Direct messaging
├── journey_progress          # Step-by-step progress
└── feedback                  # User feedback
```

---

## 📋 Key Tables

### users
**Purpose:** User profiles and authentication linkage
**Key Fields:** id, auth_user_id, email, full_name, avatar_url, bio, is_active
**Relationships:**
- Links to Supabase auth.users via auth_user_id
- Referenced by groups (created_by), memberships, enrollments, roles
**Soft Delete:** Uses is_active flag instead of hard delete

### groups
**Purpose:** Organizational units (teams, departments, cohorts)
**Key Fields:** id, name, description, label, is_public, show_member_list, settings (JSONB)
**Relationships:**
- Owned by users (created_by_user_id)
- Contains members via group_memberships
- Has roles via group_roles
**Features:** Public/private visibility, custom labels, flexible settings

### group_memberships
**Purpose:** User-group relationships with status tracking
**Key Fields:** id, group_id, user_id, member_group_id (for subgroups), status, added_by_user_id
**Status Values:** 'active', 'invited', 'paused', 'removed' (CHECK constraint enforced)
**Relationships:**
- Links users to groups
- Tracks who added the member
- Supports subgroup membership (Phase 2)

### journeys
**Purpose:** Learning experience definitions with structured content
**Key Fields:** id, title, description, content (JSONB), journey_type, is_published, is_public
**Content Structure:**
```json
{
  "version": "1.0",
  "structure": "linear",
  "steps": [
    {
      "id": "step_1",
      "title": "Step Title",
      "type": "content|activity|assessment",
      "duration_minutes": 30,
      "required": true
    }
  ]
}
```
**Journey Types:** 'predefined', 'user_created', 'dynamic'
**Current State:** 8 predefined journeys seeded (v0.2.8)

### journey_enrollments
**Purpose:** Track user and group participation in journeys
**Key Fields:** id, journey_id, user_id, group_id, enrolled_by_user_id, status, progress_data (JSONB)
**Enrollment Types:**
- Individual: user_id set, group_id NULL
- Group: group_id set, user_id NULL
**Status Values:** 'active', 'completed', 'paused', 'frozen'
**Business Rules:**
- No dual enrollment (individual + group for same journey)
- Only Group Leaders can enroll groups
- Progress stored as JSONB for flexibility

### group_roles
**Purpose:** Role instances within specific groups
**Key Fields:** id, group_id, name, description, created_from_role_template_id
**Default Roles:**
- Group Leader (created on group creation)
- Member
- Travel Guide (for journey facilitation)
**Relationships:**
- Belongs to group
- Created from role_template
- Assigned to users via user_group_roles
- Has permissions via group_role_permissions

### user_group_roles
**Purpose:** Assign roles to users within groups
**Key Fields:** id, user_id, group_id, group_role_id, assigned_by_user_id
**Features:**
- Multiple roles per user per group
- Tracks who assigned the role
- Protected by RLS (leaders can assign)
**Important Trigger:** Last leader protection prevents removing final Group Leader

---

## 🔒 Security (RLS Policies)

All tables have comprehensive Row Level Security policies. See `docs/database/rls-policies.md` for details.

**Key Security Principles:**
- Users can only see their own data
- Group members can view their groups
- Public groups visible to all authenticated users
- Leaders can manage their groups
- Invitations are user-specific
- Last leader protection at database level

---

## 🔄 Triggers & Functions

### update_updated_at_column()
Updates `updated_at` timestamp on row modification
- Applied to: users, groups, journeys

### create_user_profile()
Automatically creates user profile when Supabase auth user is created
- Trigger: ON INSERT auth.users

### handle_user_deletion()
Soft-deletes user profile when auth user is deleted
- Sets is_active = false instead of hard delete
- Trigger: ON DELETE auth.users

### prevent_last_leader_removal()
Prevents removing the last Group Leader from a group
- Raises exception if attempt to remove last leader
- Trigger: BEFORE DELETE user_group_roles
- Business rule enforcement at database level

---

## 📈 Migration History

See `docs/database/migrations-log.md` for complete history.

**Applied Migrations (10 total):**
1. `20260120_initial_schema.sql` - Initial 13-table setup
2. `20260123_fix_user_trigger_and_rls.sql` - User lifecycle improvements
3. `20260125_update_group_memberships_rls.sql` - Group membership RLS
4. `20260125_add_status_constraint.sql` - Status field validation
5. `20260125_update_members_policies.sql` - Member management RLS
6. `20260126_role_management_policies.sql` - Role assignment RLS
7. `20260126_last_leader_protection.sql` - Leader protection trigger
8. `20260126_invitation_policies.sql` - Invitation system RLS
9. `20260127_seed_predefined_journeys.sql` - 8 predefined journeys
10. `20260131_fix_journey_enrollment_rls.sql` - Fixed enrollment RLS recursion

---

## 🎯 Current State

**Phase 1.4 - Journey System (85% complete)**

**Implemented:**
- ✅ User authentication and profiles
- ✅ Group creation and management
- ✅ Member invitations and management
- ✅ Role assignment system
- ✅ Journey catalog (8 predefined journeys)
- ✅ Journey enrollment (individual + group)

**Next Phase:**
- ⏳ Journey content delivery
- ⏳ Progress tracking (step-by-step)
- ⏳ Communication features (forums, messaging)

---

## 📚 Related Documentation

- **Full schema SQL:** `docs/architecture/DATABASE_SCHEMA.md`
- **RLS policies:** `docs/database/rls-policies.md`
- **Migration log:** `docs/database/migrations-log.md`
- **Domain entities:** `docs/architecture/DOMAIN_ENTITIES.md`
- **Authorization model:** `docs/architecture/AUTHORIZATION.md`

---

## 🛠️ For Developers

**Working with the database:**
1. All queries go through Supabase client (`lib/supabase/client.ts` or `server.ts`)
2. RLS policies handle authorization automatically
3. Always use typed queries with proper TypeScript interfaces
4. Test RLS policies in Supabase dashboard SQL editor
5. Never bypass RLS (use service role key only for migrations)

**Common patterns:**
```typescript
// Get authenticated user's profile
const { data: userData } = await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', user.id)
  .single();

// Check if user is group leader
const { data: roles } = await supabase
  .from('user_group_roles')
  .select('group_roles(name)')
  .eq('user_id', userData.id)
  .eq('group_id', groupId);

const isLeader = roles?.some(r => r.group_roles?.name === 'Group Leader');
```

---

**For database-specific work, also read:** `docs/agents/contexts/database-agent.md`
