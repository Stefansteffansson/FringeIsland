# Database Migrations Log

**Last Updated:** February 4, 2026
**Total Migrations:** 10 applied

This document tracks all database migrations with notes on what changed and why.

---

## Migration History

### #1: Initial Schema (20260120_initial_schema.sql)
**Date:** January 20, 2026
**Version:** 0.2.0

**Created:**
- All 13 core tables (users, groups, journeys, etc.)
- Base RLS policies
- Utility functions (update_updated_at_column)
- Triggers for timestamp updates
- 40 permissions seeded
- 5 role templates seeded
- 4 group templates seeded

**Notes:**
- Foundation for entire system
- Comprehensive RLS policies from day one
- Flexible JSONB fields for groups.settings and journeys.content

---

### #2: User Lifecycle Fixes (20260123_fix_user_trigger_and_rls.sql)
**Date:** January 23, 2026
**Version:** 0.2.1

**Fixed:**
- User creation trigger to properly link auth.users → users
- Soft delete on account deletion (sets is_active = false)
- User search RLS policy for email-based invitations

**Changes:**
- Added `create_user_profile()` trigger function
- Added `handle_user_deletion()` trigger function
- Updated users table RLS for email search

**Reason:**
- User profiles weren't being created automatically on signup
- Account deletion was causing orphaned data
- Email search needed for member invitations

---

### #3: Group Memberships RLS (20260125_update_group_memberships_rls.sql)
**Date:** January 25, 2026
**Version:** 0.2.3

**Fixed:**
- Group membership RLS policies for invitations
- Leader permission to create invitations
- User permission to accept/decline their own invitations

**Changes:**
- Updated INSERT policy to allow leaders to invite
- Updated SELECT policy to show pending invitations
- Added DELETE policy for declining invitations

**Reason:**
- Member invitation system needed proper authorization
- Users needed to see and act on their invitations

---

### #4: Status Constraint (20260125_add_status_constraint.sql)
**Date:** January 25, 2026
**Version:** 0.2.3

**Added:**
- CHECK constraint on group_memberships.status
- Allowed values: 'active', 'invited', 'paused', 'removed'

**Reason:**
- Prevent invalid status values
- Database-level validation for business rules
- Clearer state machine for membership lifecycle

---

### #5: Member Management Policies (20260125_update_members_policies.sql)
**Date:** January 25, 2026
**Version:** 0.2.5

**Fixed:**
- Leave group functionality (DELETE policy)
- Remove member functionality (leader-only DELETE)
- Accept invitation (UPDATE policy)

**Changes:**
- Updated DELETE policies with proper leader checks
- Added UPDATE policy for accepting invitations (invited → active)

**Reason:**
- Complete member management system
- Users can leave groups
- Leaders can remove members
- Members can accept invitations

---

### #6: Role Management Policies (20260126_role_management_policies.sql)
**Date:** January 26, 2026
**Version:** 0.2.6

**Added:**
- RLS policies for user_group_roles table
- Leader permission to assign/remove roles
- SELECT policy for viewing role assignments

**Reason:**
- Role assignment UI needed proper authorization
- Leaders can promote members
- Members can view their roles

---

### #7: Last Leader Protection (20260126_last_leader_protection.sql)
**Date:** January 26, 2026
**Version:** 0.2.6.2

**Added:**
- `prevent_last_leader_removal()` trigger function
- BEFORE DELETE trigger on user_group_roles
- Prevents removing the last Group Leader from a group

**Reason:**
- Critical business rule enforcement
- Groups must always have at least one leader
- Database-level protection (can't be bypassed by application code)

**Implementation:**
```sql
-- Counts remaining leaders after potential deletion
-- Raises exception if count would be zero
IF remaining_leaders = 0 THEN
  RAISE EXCEPTION 'Cannot remove the last Group Leader';
END IF;
```

---

### #8: Invitation Policies (20260126_invitation_policies.sql)
**Date:** January 26, 2026
**Version:** 0.2.7

**Fixed:**
- Email-based invitation system RLS
- Leader permission to invite by email
- User search for invitation modal

**Changes:**
- Updated group_memberships RLS for email invitations
- Updated users SELECT policy for email search

**Reason:**
- Enable inviting members by email address
- Leaders can search users and create invitations
- Complete invitation workflow

---

### #9: Predefined Journeys (20260127_seed_predefined_journeys.sql)
**Date:** January 27, 2026
**Version:** 0.2.8

**Added:**
- 8 predefined journeys with full content
- Journey catalog data seeded
- All journeys marked as published and public

**Journeys Created:**
1. Leadership Fundamentals (180 min, Beginner)
2. Effective Communication Skills (240 min, Beginner)
3. Building High-Performance Teams (300 min, Intermediate)
4. Personal Development Kickstart (150 min, Beginner)
5. Strategic Decision Making (270 min, Advanced)
6. Emotional Intelligence at Work (210 min, Intermediate)
7. Agile Team Collaboration (200 min, Intermediate)
8. Resilience and Stress Management (180 min, Beginner)

**Structure:**
- Full JSONB content with steps
- Tags for filtering
- Difficulty levels
- Estimated durations

**Reason:**
- Journey catalog needed content
- Demonstrate platform capabilities
- Enable journey browsing and enrollment testing

---

### #10: Journey Enrollment RLS Fix (20260131_fix_journey_enrollment_rls.sql)
**Date:** January 31, 2026
**Version:** 0.2.10

**Fixed:**
- Infinite recursion in journey_enrollments SELECT policy
- Removed nested enrollment check from database level
- Moved dual-enrollment prevention to application layer

**Changes:**
- Simplified SELECT policy to avoid recursive subquery
- Enrollment validation now happens in EnrollmentModal component

**Reason:**
- Browser client couldn't handle complex recursive RLS
- Infinite recursion error blocking enrollment queries
- Application-level validation more flexible and maintainable

**Technical Note:**
- RLS policies should be simple for browser client
- Complex business rules better handled in application code
- Database still enforces basic authorization (who can see what)

---

## Migration Guidelines

### Creating New Migrations

**Naming Convention:**
```
YYYYMMDD_descriptive_name.sql
```

**Template:**
```sql
-- Migration: [Brief description]
-- Date: YYYY-MM-DD
-- Version: X.Y.Z

-- [Changes go here]

-- Verify
SELECT ...;
```

### Running Migrations

**Local Development:**
```bash
# Using Supabase CLI
supabase db push

# Or manually in SQL editor
# Copy/paste migration file
```

**Production:**
1. Test in staging environment first
2. Backup database before running
3. Run migration via Supabase dashboard SQL editor
4. Verify with SELECT queries
5. Update this log

### Testing Migrations

**Always test:**
- RLS policies work as expected
- Triggers fire correctly
- Foreign key constraints enforced
- CHECK constraints validated
- Indexes created successfully

**Test as different users:**
- Group leaders
- Regular members
- Non-members
- Unauthenticated users (if applicable)

---

## Upcoming Migrations (Planned)

### Phase 1.5 - Communication
- `journey_progress` table for step-by-step tracking
- `forum_posts` table for group discussions
- `messages` table for direct messaging
- `notifications` table for user alerts

### Phase 2 - Advanced Features
- `journey_collaborators` for multi-author journeys
- `feedback` table for journey ratings
- `analytics_events` for user activity tracking
- Subgroup support (member_group_id usage in group_memberships)

---

## Rollback Procedures

**If a migration fails:**

1. **Immediate:** Stop and assess
2. **Document:** Note the error and state
3. **Rollback:** Restore from backup
4. **Fix:** Correct migration file
5. **Test:** Verify fix in staging
6. **Retry:** Re-run corrected migration

**Critical migrations** (data loss risk):
- Always backup first
- Test thoroughly in staging
- Have rollback SQL prepared
- Monitor closely during execution

---

## Related Documentation

- **Schema overview:** `docs/database/schema-overview.md`
- **RLS policies:** `docs/database/rls-policies.md`
- **Full schema SQL:** `docs/architecture/DATABASE_SCHEMA.md`

---

**This log should be updated after every migration is applied.**
