# AUTHORIZATION.md - v0.2.5 Update Required

## 📝 This Document Needs Updating

The AUTHORIZATION.md file should be updated to include the **6 new RLS policies** from v0.2.5.

---

## ✅ New RLS Policies to Add

### Users Table
Add this new policy:
```sql
-- Allow users to search for other users by email (for group invitations)
CREATE POLICY "Users can search other users by email for invitations"
ON users FOR SELECT
TO authenticated
USING (true);
```

### Group_Memberships Table
Add these 5 new policies:

```sql
-- 1. Leaders can create invitations
CREATE POLICY "Users can create invitations for groups they lead"
ON group_memberships FOR INSERT
TO authenticated
WITH CHECK (
  status = 'invited'
  AND EXISTS (
    SELECT 1 FROM user_group_roles ugr
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE ugr.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND ugr.group_id = group_memberships.group_id
    AND gr.name = 'Group Leader'
  )
);

-- 2. Users can accept their own invitations
CREATE POLICY "Users can accept their own invitations"
ON group_memberships FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'invited'
)
WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'active'
);

-- 3. Users can decline their own invitations
CREATE POLICY "Users can decline their own invitations"
ON group_memberships FOR DELETE
TO authenticated
USING (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'invited'
);

-- 4. Members can leave groups
CREATE POLICY "Members can leave groups"
ON group_memberships FOR DELETE
TO authenticated
USING (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'active'
);

-- 5. Leaders can remove members
CREATE POLICY "Leaders can remove members from their groups"
ON group_memberships FOR DELETE
TO authenticated
USING (
  group_id IN (
    SELECT gm.group_id
    FROM group_memberships gm
    JOIN user_group_roles ugr ON ugr.user_id = gm.user_id AND ugr.group_id = gm.group_id
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE gm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND gm.status = 'active'
    AND gr.name = 'Group Leader'
  )
  AND status = 'active'
);
```

---

## ✅ Database Trigger to Document

Add section on the last leader protection trigger:

```sql
-- Trigger Function: Prevent Last Leader Removal
CREATE OR REPLACE FUNCTION prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
  is_leader BOOLEAN;
BEGIN
  -- Check if the member being removed is a leader
  SELECT EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE ugr.user_id = OLD.user_id
    AND ugr.group_id = OLD.group_id
    AND gr.name = 'Group Leader'
  ) INTO is_leader;

  -- If not a leader, allow deletion
  IF NOT is_leader THEN
    RETURN OLD;
  END IF;

  -- Count remaining leaders in the group
  SELECT COUNT(DISTINCT ugr.user_id)
  INTO leader_count
  FROM user_group_roles ugr
  JOIN group_roles gr ON gr.id = ugr.group_role_id
  JOIN group_memberships gm ON gm.user_id = ugr.user_id AND gm.group_id = ugr.group_id
  WHERE ugr.group_id = OLD.group_id
  AND gr.name = 'Group Leader'
  AND gm.status = 'active'
  AND ugr.user_id != OLD.user_id;

  -- If this is the last leader, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last leader from the group. Promote another member to leader first.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Check Last Leader Removal
CREATE TRIGGER check_last_leader_removal
BEFORE DELETE ON group_memberships
FOR EACH ROW
EXECUTE FUNCTION prevent_last_leader_removal();
```

**Purpose:** Ensures every group always has at least one leader.

---

## 📋 Summary of Changes

**Total New RLS Policies:** 6
- 1 on `users` table
- 5 on `group_memberships` table

**New Database Objects:** 2
- 1 trigger function: `prevent_last_leader_removal()`
- 1 trigger: `check_last_leader_removal`

---

## 🔗 References

See the full migration files for implementation:
- `/supabase/migrations/20260125_enable_member_invitations.sql`
- `/supabase/migrations/20260125_enable_accept_decline_invitations.sql`
- `/supabase/migrations/20260125_enable_leave_remove_members.sql`

---

**Update AUTHORIZATION.md with these policies and triggers to reflect v0.2.5 changes.**
