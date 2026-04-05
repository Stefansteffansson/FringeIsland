# AUTHORIZATION.md - Updated for RBAC (v0.2.5+)

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
-- 1. Stewards can create invitations
CREATE POLICY "Users can create invitations for groups they lead"
ON group_memberships FOR INSERT
TO authenticated
WITH CHECK (
  status = 'invited'
  AND EXISTS (
    SELECT 1 FROM user_group_roles ugr
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE ugr.member_group_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND ugr.group_id = group_memberships.group_id
    AND gr.name = 'Steward'
  )
);

-- 2. Users can accept their own invitations
CREATE POLICY "Users can accept their own invitations"
ON group_memberships FOR UPDATE
TO authenticated
USING (
  member_group_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'invited'
)
WITH CHECK (
  member_group_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'active'
);

-- 3. Users can decline their own invitations
CREATE POLICY "Users can decline their own invitations"
ON group_memberships FOR DELETE
TO authenticated
USING (
  member_group_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'invited'
);

-- 4. Members can leave groups
CREATE POLICY "Members can leave groups"
ON group_memberships FOR DELETE
TO authenticated
USING (
  member_group_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND status = 'active'
);

-- 5. Stewards can remove members
CREATE POLICY "Stewards can remove members from their groups"
ON group_memberships FOR DELETE
TO authenticated
USING (
  group_id IN (
    SELECT gm.group_id
    FROM group_memberships gm
    JOIN user_group_roles ugr ON ugr.member_group_id = gm.member_group_id AND ugr.group_id = gm.group_id
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE gm.member_group_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND gm.status = 'active'
    AND gr.name = 'Steward'
  )
  AND status = 'active'
);
```

---

## ✅ Database Trigger to Document

Add section on the last Steward protection trigger:

```sql
-- Trigger Function: Prevent Last Steward Removal
CREATE OR REPLACE FUNCTION prevent_last_steward_removal()
RETURNS TRIGGER AS $$
DECLARE
  steward_count INTEGER;
  is_steward BOOLEAN;
BEGIN
  -- Check if the member being removed is a Steward
  SELECT EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON gr.id = ugr.group_role_id
    WHERE ugr.member_group_id = OLD.member_group_id
    AND ugr.group_id = OLD.group_id
    AND gr.name = 'Steward'
  ) INTO is_steward;

  -- If not a Steward, allow deletion
  IF NOT is_steward THEN
    RETURN OLD;
  END IF;

  -- Count remaining Stewards in the group
  SELECT COUNT(DISTINCT ugr.member_group_id)
  INTO steward_count
  FROM user_group_roles ugr
  JOIN group_roles gr ON gr.id = ugr.group_role_id
  JOIN group_memberships gm ON gm.member_group_id = ugr.member_group_id AND gm.group_id = ugr.group_id
  WHERE ugr.group_id = OLD.group_id
  AND gr.name = 'Steward'
  AND gm.status = 'active'
  AND ugr.member_group_id != OLD.member_group_id;

  -- If this is the last Steward, prevent deletion
  IF steward_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Steward from the group. Promote another member to Steward first.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Check Last Steward Removal
CREATE TRIGGER check_last_steward_removal
BEFORE DELETE ON group_memberships
FOR EACH ROW
EXECUTE FUNCTION prevent_last_steward_removal();
```

**Purpose:** Ensures every group always has at least one Steward.

---

## 📋 Summary of Changes

**Total New RLS Policies:** 6
- 1 on `users` table
- 5 on `group_memberships` table

**New Database Objects:** 2
- 1 trigger function: `prevent_last_steward_removal()`
- 1 trigger: `check_last_steward_removal`

---

## 🔗 References

See the full migration files for implementation:
- `/supabase/migrations/20260125_enable_member_invitations.sql`
- `/supabase/migrations/20260125_enable_accept_decline_invitations.sql`
- `/supabase/migrations/20260125_enable_leave_remove_members.sql`

---

**These policies and triggers reflect the post-RBAC schema (v0.2.5+), including the D15 migration (`user_id` → `member_group_id` in group_memberships) and role rename ("Group Leader" → "Steward").**
