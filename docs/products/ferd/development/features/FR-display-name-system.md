# Display Name / Nickname System

**Status:** IMPLEMENTED
**Date:** February 27, 2026
**Completed:** February 27, 2026
**Phase:** 1.6 (Polish and Launch)
**Related:** [Dynamic Permissions System](./AR-dynamic-permissions-system.md) (D9, D15) | Personal Group Pattern

---

## Context

The platform currently displays `users.full_name` (real first + last name) across all social surfaces. The D15 Universal Group Pattern established the personal group as the user's public-facing identity — forums already query `groups.name` via `author_group_id`. However, no nickname/alias concept exists, and several surfaces (messages, navigation, member lists) still bypass the personal group and query `users.full_name` directly.

Users need the ability to choose how they appear on the platform. Some users will want to use their real name; others will prefer a nickname or alias. This is especially relevant for a personal development platform where participants may want privacy while engaging in vulnerable learning activities.

---

## Feature Summary

1. Users can set a **nickname** (alias/avatar name) on their profile
2. Users can **toggle** between displaying their real name or nickname platform-wide
3. The **personal group `name`** field is the single source of truth for display identity
4. **All surfaces** resolve display names from the personal group `name` — no direct `full_name` reads in social contexts
5. Other users can only see the real name behind a nickname if the user has opted into **public profile visibility** (off by default)

---

## Data Model Changes

### New columns on `users` table

| Column | Type | Default | Nullable | Purpose |
|--------|------|---------|----------|---------|
| `nickname` | TEXT NOT NULL | First name extracted from `full_name` | No | The user's chosen alias/avatar name |
| `display_preference` | TEXT NOT NULL | `'nickname'` | No | `'real_name'` or `'nickname'` — controls what the personal group `name` is set to |
| `show_real_name` | BOOLEAN NOT NULL | `false` | No | Whether other (non-admin) users can see the real `full_name` behind a nickname |

**Constraints:**
```sql
CHECK (display_preference IN ('real_name', 'nickname'))
CHECK (char_length(nickname) >= 1)  -- never blank
```

### No new tables required

The personal group `name` field already exists and is already queried by forums. The new columns on `users` are metadata that drive what value gets written to `groups.name`.

> **Note:** For the full `users` table schema, see [Authentication](./FR-authentication.md).

---

## Core Mechanism

### How the toggle works

When a user changes their `display_preference` (or edits their nickname/real name):

1. Update `users.nickname` or `users.full_name` or `users.display_preference` as appropriate
2. Compute the new display name:
   - If `display_preference = 'nickname'` → use `nickname`
   - If `display_preference = 'real_name'` → use `full_name`
3. Update `groups.name` on the user's personal group to the computed display name
4. All surfaces that read from personal group `name` automatically reflect the change

**This can be implemented as:**
- A database trigger on `users` that syncs personal group `name` on any UPDATE to `nickname`, `full_name`, or `display_preference`
- OR an application-layer function that updates both in a single transaction

**Recommended:** Database trigger for consistency — ensures the personal group `name` is always in sync regardless of how the user record is updated.

### Signup flow changes

Current `handle_new_user()` trigger (7 steps). Changes needed:

- **Step 1 (create user):** Set `nickname` to first name extracted from `full_name` (e.g., `split_part(full_name, ' ', 1)`), `display_preference` to `'nickname'`, `show_real_name` to `false`
- **Step 2 (create personal group):** Set `groups.name` to the `nickname` value (not `full_name`)

This means **new users appear by first name by default**, not by full name.

---

## Affected Surfaces

### Already using personal group `name` (no changes needed)

| Surface | Query pattern |
|---------|--------------|
| **Forum posts** | `groups!author_group_id (id, name, avatar_url)` |
| **Forum replies** | Same as above |

### Need frontend migration to personal group `name` (pending implementation)

| Surface | Current pattern | New pattern |
|---------|----------------|-------------|
| **Messages inbox** (`app/messages/page.tsx`) | `users.full_name` | Resolve via personal group `name` |
| **Message conversation** (`app/messages/[conversationId]/page.tsx`) | `users.full_name` | Resolve via personal group `name` |
| **Navigation bar** (`components/Navigation.tsx`) | `userProfile.full_name` | `userProfile.display_name` (resolved from personal group) |
| **Member lists** (`app/groups/[id]/page.tsx`) | `users.full_name` via membership joins | Personal group `name` via `member_group_id` |
| **Invite modal** (`components/groups/InviteMemberModal.tsx`) | `users.full_name` | Personal group `name` (search results may still show real name for identification) |
| **Admin panels** | `users.full_name` | Keep `full_name` — admins always see real names |
| **Profile page** (`app/profile/page.tsx`) | `users.full_name` | Show both: real name + nickname with toggle |

### Special cases

- **User search for invitations:** When searching for users to invite, the search should match against both `full_name` AND `nickname` — but display results using the user's chosen display name. Group leaders sending invitations may need to see the real name for identification purposes (if the user has `show_real_name = true`).
- **Admin panel:** Always shows `users.full_name` regardless of display preference. Admins need to identify real people.
- **Profile page (own):** Shows both the real name and nickname, since the user is viewing their own profile.
- **Profile page (other user):** Shows the display name (personal group `name`). Shows real name only if `show_real_name = true`.

---

## UI Changes

### Profile Edit Page (`app/profile/edit/page.tsx`)

New fields to add:

1. **Nickname** — text input, required, min 1 character
   - Label: "Nickname / Display Name"
   - Help text: "This is how other users will see you on the platform"
   - Pre-filled with first name on first visit

2. **Display preference** — toggle or radio buttons
   - Options: "Show my nickname" (default) / "Show my real name"
   - When toggled, immediately previews what others will see

3. **Profile visibility** — toggle
   - Label: "Allow others to see my real name"
   - Help text: "When turned off, only your nickname is visible to other users"
   - Default: off

### Profile View Page (`app/profile/page.tsx`)

- Show the display name prominently (whatever personal group `name` is)
- If viewing own profile: show both real name and nickname with current preference indicated
- If viewing another user's profile: show display name; show real name only if `show_real_name = true`

### Navigation Bar

- Replace `userProfile.full_name` with the display name from personal group
- Avatar initial should use the display name, not full_name

---

## RLS Considerations

### `users.nickname` and `users.display_preference`

- **SELECT:** Same policy as existing `users` columns — users can read their own record; other users can read limited fields for search/display
- **UPDATE:** Users can update their own `nickname`, `display_preference`, and `show_real_name`

### `users.full_name` visibility

- The existing `users` SELECT policy allows other users to see `full_name` (for invitation search). **Resolved:** RLS is row-level, not column-level, so `show_real_name` enforcement is handled at the application query layer:
  - **Regular queries:** Don't SELECT `full_name` for other users unless `show_real_name = true`
  - **Admin queries:** Use service role (bypasses RLS), always see `full_name`
  - **Own profile:** User always sees their own `full_name`
  - No RLS policy changes needed.

### Personal group `name` sync trigger

- Needs to be `SECURITY DEFINER` since it updates `groups.name` and the user may not have direct UPDATE permission on groups they don't own (though personal groups are owned by the user, so this may not be an issue)

---

## Migration Plan

### Database migration

```sql
-- 1. Add new columns to users table
ALTER TABLE users
  ADD COLUMN nickname TEXT,
  ADD COLUMN display_preference TEXT NOT NULL DEFAULT 'nickname'
    CHECK (display_preference IN ('real_name', 'nickname')),
  ADD COLUMN show_real_name BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill nickname from existing full_name (first name)
UPDATE users
SET nickname = split_part(full_name, ' ', 1)
WHERE nickname IS NULL;

-- 3. Add NOT NULL constraint after backfill
ALTER TABLE users
  ALTER COLUMN nickname SET NOT NULL;

-- 4. Add length check
ALTER TABLE users
  ADD CONSTRAINT nickname_not_empty CHECK (char_length(nickname) >= 1);

-- 5. Sync personal group names to nickname (since default is nickname display)
UPDATE groups g
SET name = u.nickname
FROM users u
WHERE u.personal_group_id = g.id
  AND g.group_type = 'personal';

-- 6. Create sync trigger
CREATE OR REPLACE FUNCTION sync_personal_group_display_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.personal_group_id IS NOT NULL AND (
    OLD.nickname IS DISTINCT FROM NEW.nickname OR
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.display_preference IS DISTINCT FROM NEW.display_preference
  ) THEN
    UPDATE groups
    SET name = CASE
      WHEN NEW.display_preference = 'nickname' THEN NEW.nickname
      WHEN NEW.display_preference = 'real_name' THEN NEW.full_name
      ELSE NEW.nickname
    END
    WHERE id = NEW.personal_group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER sync_display_name_to_personal_group
AFTER UPDATE OF nickname, full_name, display_preference ON users
FOR EACH ROW
EXECUTE FUNCTION sync_personal_group_display_name();

-- 7. Update handle_new_user() to set nickname and personal group name
-- (See signup flow changes above)
```

### Frontend migration

Surfaces to update (in priority order):

1. **AuthContext** — include `nickname`, `display_preference`, `show_real_name` in `UserProfile` interface and fetch
2. **Profile edit page** — add nickname, display preference, and visibility toggle fields
3. **Navigation** — switch from `full_name` to personal group `name` (or a `display_name` computed field)
4. **Messages** — resolve display names via personal group instead of `users.full_name`
5. **Member lists** — already have `member_group_id` available; use personal group `name`
6. **Invite modal** — update search to match nickname + full_name, display appropriately
7. **Profile view page** — conditional display based on own profile vs. other user + `show_real_name`

---

## Behaviors (for test specs)

### B1: Nickname defaults to first name
- **Given** a new user signs up with full_name "Stefan Stefansson"
- **When** the account is created
- **Then** `nickname` is "Stefan" and personal group `name` is "Stefan"

### B2: Display preference toggle
- **Given** a user with nickname "Mogwai" and full_name "Stefan Stefansson"
- **When** they set `display_preference` to `'real_name'`
- **Then** their personal group `name` becomes "Stefan Stefansson"
- **When** they set `display_preference` to `'nickname'`
- **Then** their personal group `name` becomes "Mogwai"

### B3: Nickname edit syncs to personal group
- **Given** a user with `display_preference = 'nickname'` and nickname "Mogwai"
- **When** they change nickname to "Gizmo"
- **Then** their personal group `name` becomes "Gizmo"

### B4: Real name edit syncs when preference is real_name
- **Given** a user with `display_preference = 'real_name'` and full_name "Stefan Stefansson"
- **When** they change full_name to "Stefan S."
- **Then** their personal group `name` becomes "Stefan S."

### B5: Nickname cannot be blank
- **Given** a user editing their profile
- **When** they try to set nickname to "" (empty string)
- **Then** the update is rejected (database constraint)

### B6: Real name visibility default
- **Given** a new user
- **Then** `show_real_name` is `false`
- **And** other users cannot see their `full_name`

### B7: Real name visibility opt-in
- **Given** a user with `show_real_name = false`
- **When** they toggle `show_real_name` to `true`
- **Then** other users viewing their profile can see `full_name`

### B8: Admin always sees real name
- **Given** an admin viewing any user (via admin panel)
- **Then** `full_name` is always visible regardless of `show_real_name`

### B9: Forum posts show display name
- **Given** a user with nickname "Mogwai" and `display_preference = 'nickname'`
- **When** they post in a forum
- **Then** the post shows "Mogwai" as the author (via personal group `name`)

### B10: Messages show display name
- **Given** a user with nickname "Mogwai" and `display_preference = 'nickname'`
- **When** another user views a conversation with them
- **Then** the conversation shows "Mogwai" (not the real name)

### B11: Invitation search matches both names
- **Given** a user with full_name "Stefan Stefansson" and nickname "Mogwai"
- **When** a group leader searches for "Stefan" OR "Mogwai"
- **Then** the user appears in search results
- **And** the result displays the user's chosen display name

---

## Out of Scope

- **Per-group display names** — this is a platform-wide preference, not per-group
- **Name history / audit trail** — not tracking previous nicknames
- **Nickname uniqueness** — multiple users can have the same nickname (they are identified by personal group ID, not name)
- **Profanity filtering** — not in Phase 1.6
- **Notification preferences for name changes** — no notifications when someone changes their display name

---

## Dependencies

- D15 Universal Group Pattern (COMPLETE) — personal groups exist and are the identity anchor
- D9 Personal Group = User Identity (COMPLETE) — personal group `name` is already queried by forums
- Profile edit page (EXISTS) — needs new fields added
- `handle_new_user()` trigger (EXISTS) — needs update for nickname initialization

---

## Open Questions

None — all requirements clarified in the design conversation (Feb 27, 2026).

---

## Architect Review

**Status:** APPROVED (Feb 27, 2026). All 9 review points confirmed — schema, triggers, backfill, RLS strategy, signup changes, and test coverage mapping (25 assertions across B-DISP-001 through B-DISP-011). Key clarifications: sync trigger is AFTER UPDATE (avoids BEFORE trigger conflicts), `show_real_name` enforced at application layer (not RLS), `display_name` is a query-time join (not a DB column). No design gaps found.
