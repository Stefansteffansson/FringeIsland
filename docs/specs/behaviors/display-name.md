# Display Name Behaviors

> **Purpose:** Document the fundamental rules and guarantees for the display name / nickname system.
> **Domain Code:** DISP
> **Feature Doc:** `docs/features/planned/display-name-system.md`

---

## B-DISP-001: Nickname Defaults to First Name on Signup

**Rule:** When a new user signs up, their `nickname` MUST be set to the first word of their `full_name`, and their personal group `name` MUST be set to that nickname.

**Why:** Users should appear by first name by default — friendly and semi-private. Full real names are never exposed without explicit consent.

**Verified by:**
- **Test:** `tests/integration/users/display-name.test.ts`
- **Database:** `handle_new_user()` trigger function
- **Trigger:** Sets `nickname = split_part(full_name, ' ', 1)`, personal group `name = nickname`

**Acceptance Criteria:**
- [ ] Signup creates user with `nickname` = first word of `full_name`
- [ ] Signup creates personal group with `name` = `nickname` (not `full_name`)
- [ ] `display_preference` defaults to `'nickname'`
- [ ] Single-word `full_name` (no space) uses the entire name as nickname
- [ ] Multi-word `full_name` (e.g., "Mary Jo Smith") uses first word only ("Mary")

**Examples:**

✅ **Valid:**
- User signs up with `full_name = "Stefan Stefansson"` → `nickname = "Stefan"`, personal group `name = "Stefan"`
- User signs up with `full_name = "Madonna"` → `nickname = "Madonna"`, personal group `name = "Madonna"`
- User signs up with `full_name = "Mary Jo Smith"` → `nickname = "Mary"`, personal group `name = "Mary"`

❌ **Invalid:**
- Personal group `name` set to `"Stefan Stefansson"` (full name) on signup → WRONG, should be `"Stefan"`
- `nickname` is NULL after signup → WRONG, must always be set
- `nickname` is empty string after signup → WRONG, violates NOT NULL + CHECK constraint

**Edge Cases:**

- **Scenario:** User signs up with email only (no display_name in metadata)
  - **Behavior:** `full_name` falls back to email; `nickname` = email prefix or full email
  - **Why:** `split_part(email, ' ', 1)` returns the full email (no space), which is acceptable as a default nickname

- **Scenario:** User signs up with leading/trailing spaces in name
  - **Behavior:** `split_part` operates on the raw value; trim should be applied
  - **Why:** Prevents nicknames like " Stefan" with leading whitespace

**Related Behaviors:**
- B-AUTH-001: Sign Up Creates Profile
- B-DISP-002: Display Preference Toggle
- B-DISP-005: Nickname Cannot Be Blank

**Testing Priority:** 🔴 CRITICAL (signup path, trigger correctness)

**History:**
- 2026-02-27: Created

---

## B-DISP-002: Display Preference Toggle Syncs Personal Group Name

**Rule:** When a user changes their `display_preference`, their personal group `name` MUST be updated to reflect the chosen preference — `nickname` if `'nickname'`, `full_name` if `'real_name'`.

**Why:** The personal group `name` is the single source of truth for display identity across all social surfaces (forums, messages, member lists). It must always match the user's current preference.

**Verified by:**
- **Test:** `tests/integration/users/display-name.test.ts`
- **Database:** `sync_personal_group_display_name()` trigger function
- **Trigger:** `sync_display_name_to_personal_group` on `users` table

**Acceptance Criteria:**
- [ ] Setting `display_preference = 'real_name'` updates personal group `name` to `full_name`
- [ ] Setting `display_preference = 'nickname'` updates personal group `name` to `nickname`
- [ ] The sync happens automatically via database trigger (not application code)
- [ ] Changing an unrelated column (e.g., `bio`) does NOT trigger a personal group name update

**Examples:**

✅ **Valid:**
- User has `nickname = "Mogwai"`, `full_name = "Stefan Stefansson"` → sets `display_preference = 'real_name'` → personal group `name` becomes `"Stefan Stefansson"`
- Same user sets `display_preference = 'nickname'` → personal group `name` becomes `"Mogwai"`

❌ **Invalid:**
- User sets `display_preference = 'real_name'` but personal group `name` stays as `"Mogwai"` → WRONG, trigger failed
- User updates `bio` and personal group `name` changes → WRONG, trigger should not fire for unrelated columns

**Edge Cases:**

- **Scenario:** User has no personal group (e.g., legacy record with `personal_group_id = NULL`)
  - **Behavior:** Trigger checks `IF NEW.personal_group_id IS NOT NULL` — skips silently
  - **Why:** Prevents errors for edge-case records that lack a personal group

- **Scenario:** `display_preference` set to an invalid value
  - **Behavior:** Blocked by CHECK constraint: `display_preference IN ('real_name', 'nickname')`
  - **Why:** Only two valid states

**Related Behaviors:**
- B-DISP-003: Nickname Edit Syncs
- B-DISP-004: Real Name Edit Syncs

**Testing Priority:** 🔴 CRITICAL (core mechanism, affects all social surfaces)

**History:**
- 2026-02-27: Created

---

## B-DISP-003: Nickname Edit Syncs When Preference Is Nickname

**Rule:** When a user changes their `nickname` and their `display_preference` is `'nickname'`, the personal group `name` MUST update to the new nickname immediately.

**Why:** If the user chose to display their nickname, changing it must propagate everywhere instantly — forums, messages, member lists all read from personal group `name`.

**Verified by:**
- **Test:** `tests/integration/users/display-name.test.ts`
- **Database:** `sync_personal_group_display_name()` trigger function

**Acceptance Criteria:**
- [ ] Changing `nickname` when `display_preference = 'nickname'` updates personal group `name` to the new nickname
- [ ] Changing `nickname` when `display_preference = 'real_name'` does NOT change personal group `name`

**Examples:**

✅ **Valid:**
- User has `display_preference = 'nickname'`, `nickname = "Mogwai"` → changes nickname to `"Gizmo"` → personal group `name` becomes `"Gizmo"`

❌ **Invalid:**
- User has `display_preference = 'real_name'`, changes nickname → personal group `name` changes → WRONG, preference is real_name so personal group `name` should stay as `full_name`

**Edge Cases:**

- **Scenario:** User changes both `nickname` and `display_preference` in the same UPDATE
  - **Behavior:** Trigger fires once with NEW values for both; result is correct based on the new preference
  - **Why:** PostgreSQL fires AFTER UPDATE trigger once per row, with all NEW values

**Related Behaviors:**
- B-DISP-002: Display Preference Toggle
- B-DISP-005: Nickname Cannot Be Blank

**Testing Priority:** 🔴 CRITICAL (trigger correctness)

**History:**
- 2026-02-27: Created

---

## B-DISP-004: Real Name Edit Syncs When Preference Is Real Name

**Rule:** When a user changes their `full_name` and their `display_preference` is `'real_name'`, the personal group `name` MUST update to the new full name immediately.

**Why:** If the user chose to display their real name, updating it must propagate to all surfaces via the personal group `name`.

**Verified by:**
- **Test:** `tests/integration/users/display-name.test.ts`
- **Database:** `sync_personal_group_display_name()` trigger function

**Acceptance Criteria:**
- [ ] Changing `full_name` when `display_preference = 'real_name'` updates personal group `name` to the new full name
- [ ] Changing `full_name` when `display_preference = 'nickname'` does NOT change personal group `name`

**Examples:**

✅ **Valid:**
- User has `display_preference = 'real_name'`, `full_name = "Stefan Stefansson"` → changes to `"Stefan S."` → personal group `name` becomes `"Stefan S."`

❌ **Invalid:**
- User has `display_preference = 'nickname'`, changes `full_name` → personal group `name` changes → WRONG, should stay as nickname

**Edge Cases:**

- **Scenario:** User clears full_name to empty string
  - **Behavior:** Blocked by existing NOT NULL constraint on `full_name`
  - **Why:** `full_name` is required

**Related Behaviors:**
- B-DISP-002: Display Preference Toggle
- B-DISP-003: Nickname Edit Syncs

**Testing Priority:** 🟡 HIGH (symmetric to B-DISP-003 but less commonly used)

**History:**
- 2026-02-27: Created

---

## B-DISP-005: Nickname Cannot Be Blank

**Rule:** The `nickname` field MUST never be empty. The database MUST reject any UPDATE or INSERT that sets `nickname` to an empty string or NULL.

**Why:** Every user must have a display name. A blank nickname would result in empty author names in forums, messages, and member lists.

**Verified by:**
- **Test:** `tests/integration/users/display-name.test.ts`
- **Database:** `NOT NULL` constraint + `CHECK (char_length(nickname) >= 1)` on `users.nickname`

**Acceptance Criteria:**
- [ ] UPDATE setting `nickname = ''` is rejected by database constraint
- [ ] UPDATE setting `nickname = NULL` is rejected by NOT NULL constraint
- [ ] INSERT with `nickname = ''` is rejected
- [ ] INSERT with `nickname = NULL` is rejected (after column is NOT NULL)
- [ ] Whitespace-only nicknames (e.g., `' '`) should be handled (application layer trim, or additional constraint)

**Examples:**

✅ **Valid:**
- `nickname = "Mogwai"` → accepted
- `nickname = "X"` → accepted (single character is valid)
- `nickname = "42"` → accepted (numbers are valid)

❌ **Invalid:**
- `nickname = ""` → REJECTED (CHECK constraint)
- `nickname = NULL` → REJECTED (NOT NULL)

**Edge Cases:**

- **Scenario:** Nickname is whitespace only (e.g., `"   "`)
  - **Behavior:** `char_length('   ') = 3` which passes the CHECK constraint — but displays as blank
  - **Why:** Application layer should trim before saving; optionally add `CHECK (char_length(trim(nickname)) >= 1)` to catch this at DB level

**Related Behaviors:**
- B-DISP-001: Nickname Defaults to First Name
- B-DISP-003: Nickname Edit Syncs

**Testing Priority:** 🔴 CRITICAL (data integrity, prevents blank display names)

**History:**
- 2026-02-27: Created

---

## B-DISP-006: Real Name Visibility Default Is False

**Rule:** New users MUST have `show_real_name = false` by default. When `show_real_name` is false, other users MUST NOT be able to see the user's `full_name`.

**Why:** Privacy by default. Users on a personal development platform may be engaging in vulnerable activities and should control who sees their real identity.

**Verified by:**
- **Test:** `tests/integration/users/display-name-rls.test.ts`
- **Database:** `show_real_name BOOLEAN NOT NULL DEFAULT false` on `users` table
- **Application:** Queries for other users' profiles must not SELECT `full_name` unless `show_real_name = true`

**Acceptance Criteria:**
- [ ] New user has `show_real_name = false` after signup
- [ ] When `show_real_name = false`, queries by other authenticated users do NOT return `full_name`
- [ ] The user can always see their own `full_name` (regardless of the toggle)
- [ ] Enforcement is at the application query layer (column selection), not RLS (which is row-level)

**Examples:**

✅ **Valid:**
- User A has `show_real_name = false` → User B queries User A's profile → sees personal group `name` (nickname) but NOT `full_name`
- User A views own profile → sees both `full_name` and `nickname`

❌ **Invalid:**
- User A has `show_real_name = false` → User B can see `full_name = "Stefan Stefansson"` → WRONG, privacy violation

**Edge Cases:**

- **Scenario:** Invitation search — a group leader searches for a user
  - **Behavior:** Search matches against both `full_name` and `nickname` (server-side), but results only display `full_name` if `show_real_name = true`
  - **Why:** Leaders need to find users, but the search results should respect the user's privacy setting

**Related Behaviors:**
- B-DISP-007: Real Name Visibility Opt-In
- B-DISP-008: Admin Always Sees Real Name

**Testing Priority:** 🟡 HIGH (privacy, user trust)

**History:**
- 2026-02-27: Created

---

## B-DISP-007: Real Name Visibility Opt-In

**Rule:** When a user sets `show_real_name = true`, other users viewing their profile MUST be able to see their `full_name` alongside their display name.

**Why:** Some users want to be identifiable by real name — for professional networking or trust-building within groups.

**Verified by:**
- **Test:** `tests/integration/users/display-name-rls.test.ts`
- **Application:** Profile view page conditionally shows `full_name` based on `show_real_name`

**Acceptance Criteria:**
- [ ] User toggles `show_real_name` to `true` → other users can see `full_name` on their profile
- [ ] User toggles `show_real_name` back to `false` → `full_name` is hidden again
- [ ] The toggle only affects profile visibility, NOT the display name in forums/messages (those always use personal group `name`)

**Examples:**

✅ **Valid:**
- User A sets `show_real_name = true` → User B views profile → sees `"Mogwai (Stefan Stefansson)"`
- User A sets `show_real_name = false` → User B views profile → sees `"Mogwai"` only

❌ **Invalid:**
- User A sets `show_real_name = true` → forum posts now show `"Stefan Stefansson"` instead of `"Mogwai"` → WRONG, forum posts always use personal group `name` which is driven by `display_preference`, not `show_real_name`

**Edge Cases:**

- **Scenario:** `show_real_name = true` but `display_preference = 'real_name'`
  - **Behavior:** Personal group `name` is already the real name; `show_real_name` is redundant in this case but harmless
  - **Why:** The two settings are independent — one controls display name, the other controls profile visibility

**Related Behaviors:**
- B-DISP-006: Real Name Visibility Default
- B-DISP-002: Display Preference Toggle

**Testing Priority:** 🟡 HIGH (privacy, user trust)

**History:**
- 2026-02-27: Created

---

## B-DISP-008: Admin Always Sees Real Name

**Rule:** Admin users (DeusEx members) MUST always be able to see `users.full_name` regardless of the user's `show_real_name` setting.

**Why:** Admins need to identify real people for moderation, support, and compliance purposes.

**Verified by:**
- **Test:** `tests/integration/users/display-name-rls.test.ts`
- **Application:** Admin panel queries `users.full_name` directly via service role or admin RPC

**Acceptance Criteria:**
- [ ] Admin viewing user list sees `full_name` for all users
- [ ] Admin viewing user detail sees `full_name` regardless of `show_real_name` value
- [ ] This works via the existing admin service role pattern (not a special RLS bypass)

**Examples:**

✅ **Valid:**
- User has `show_real_name = false` → admin sees `full_name = "Stefan Stefansson"` in admin panel
- User has `show_real_name = true` → admin sees `full_name = "Stefan Stefansson"` in admin panel (same)

❌ **Invalid:**
- Admin cannot see real name because `show_real_name = false` → WRONG, admin must always see real names

**Edge Cases:**

- **Scenario:** Admin is also a regular group member viewing the group page (not admin panel)
  - **Behavior:** In the group context, they see the display name (personal group `name`) like everyone else. Admin override only applies in the admin panel.
  - **Why:** Separation of concerns — admin powers are scoped to the admin panel, not leaked into regular group interactions

**Related Behaviors:**
- B-DISP-006: Real Name Visibility Default
- B-DISP-007: Real Name Visibility Opt-In

**Testing Priority:** 🟡 HIGH (admin functionality, compliance)

**History:**
- 2026-02-27: Created

---

## B-DISP-009: Forum Posts Show Display Name

**Rule:** Forum posts MUST display the author's personal group `name` as the author name, reflecting their current `display_preference`.

**Why:** Forums are the primary social surface. Consistent display name usage builds trust and identity within groups.

**Verified by:**
- **Test:** `tests/integration/users/display-name.test.ts` (smoke test)
- **Code:** `components/groups/forum/ForumSection.tsx` — queries `groups!author_group_id (id, name, avatar_url)`
- **Code:** `components/groups/forum/ForumPost.tsx` — renders `post.author.name`

**Acceptance Criteria:**
- [ ] Forum posts display `groups.name` from the author's personal group (via `author_group_id` FK)
- [ ] When user changes nickname and preference is `'nickname'`, new and existing posts reflect the new nickname
- [ ] When user switches to `'real_name'`, posts reflect the real name

**Examples:**

✅ **Valid:**
- User with `display_preference = 'nickname'`, `nickname = "Mogwai"` posts in forum → author shows `"Mogwai"`
- User changes nickname to `"Gizmo"` → trigger updates personal group `name` → existing forum posts now show `"Gizmo"` (name is resolved at read time via FK join, not stored per-post)

❌ **Invalid:**
- Forum post shows `full_name = "Stefan Stefansson"` when `display_preference = 'nickname'` → WRONG

**Edge Cases:**

- **Scenario:** Author's personal group is deleted (should never happen, but defensive)
  - **Behavior:** Forum post shows fallback (e.g., "Unknown" or "?")
  - **Why:** FK is ON DELETE CASCADE on `forum_posts.author_group_id`, so the post itself would be deleted

**Related Behaviors:**
- B-DISP-002: Display Preference Toggle

**Testing Priority:** 🟢 MEDIUM (already working via existing query pattern — verify, don't rebuild)

**History:**
- 2026-02-27: Created

---

## B-DISP-010: Messages Show Display Name

**Rule:** Direct message conversations MUST display the other participant's personal group `name` (display name), NOT their `full_name` directly.

**Why:** Consistent identity across all social surfaces. If a user chose to go by "Mogwai", they should see "Mogwai" everywhere — forums, messages, member lists.

**Verified by:**
- **Test:** (UI integration — verified in Phase 5c)
- **Code:** `app/messages/page.tsx` — currently queries `users.full_name` (NEEDS MIGRATION)
- **Code:** `app/messages/[conversationId]/page.tsx` — currently queries `users.full_name` (NEEDS MIGRATION)

**Acceptance Criteria:**
- [ ] Message inbox shows the other user's personal group `name`, not `full_name`
- [ ] Message conversation header shows the other user's personal group `name`
- [ ] Avatar initial uses personal group `name` first character
- [ ] When the other user changes their display name, it updates on next page load

**Examples:**

✅ **Valid:**
- User B has `display_preference = 'nickname'`, `nickname = "Mogwai"` → User A opens messages with User B → header shows `"Mogwai"`

❌ **Invalid:**
- Message header shows `"Stefan Stefansson"` when User B's preference is `'nickname'` → WRONG

**Edge Cases:**

- **Scenario:** Conversation with a deactivated user
  - **Behavior:** Show last known display name or fallback "Deactivated User"
  - **Why:** Deactivated users' personal groups still exist but user is `is_active = false`

**Related Behaviors:**
- B-DISP-002: Display Preference Toggle
- B-DISP-009: Forum Posts Show Display Name

**Testing Priority:** 🟡 HIGH (user-facing, currently broken — shows `full_name`)

**History:**
- 2026-02-27: Created

---

## B-DISP-011: Invitation Search Matches Both Names

**Rule:** When searching for users to invite to a group, the search MUST match against both `full_name` AND `nickname`. Results MUST display the user's chosen display name (personal group `name`), and only show `full_name` if `show_real_name = true`.

**Why:** Group leaders need to find users regardless of whether they search by real name or nickname. But search results must respect the user's privacy setting.

**Verified by:**
- **Test:** `tests/integration/users/display-name-rls.test.ts`
- **Code:** `components/groups/InviteMemberModal.tsx` — search query (NEEDS MIGRATION)

**Acceptance Criteria:**
- [ ] Searching "Stefan" finds a user with `full_name = "Stefan Stefansson"` even if their nickname is "Mogwai"
- [ ] Searching "Mogwai" finds the same user
- [ ] Search results display personal group `name` as the primary identifier
- [ ] Search results show `full_name` only if the user has `show_real_name = true`
- [ ] Search results do NOT show `full_name` if `show_real_name = false`
- [ ] The search still excludes users who are already members of the group
- [ ] The search still excludes the current user (self)

**Examples:**

✅ **Valid:**
- Leader searches "Mog" → finds user with `nickname = "Mogwai"` → result shows `"Mogwai"` (+ `"Stefan Stefansson"` only if `show_real_name = true`)
- Leader searches "Stefan" → finds same user (matches `full_name`) → result shows `"Mogwai"` as primary name

❌ **Invalid:**
- Leader searches "Stefan" → no results because nickname is "Mogwai" → WRONG, must search `full_name` too
- Search result shows `"Stefan Stefansson"` as primary name when `show_real_name = false` → WRONG, privacy violation

**Edge Cases:**

- **Scenario:** User has `show_real_name = false` and leader searches by their real name
  - **Behavior:** User is found (server-side match), but the result card shows the nickname only
  - **Why:** The match is legitimate (leader might know the real name), but the display respects privacy

- **Scenario:** Nickname and full_name are identical (e.g., user set nickname to their full name)
  - **Behavior:** No special handling — search finds them, display shows the name once
  - **Why:** Edge case with no UX impact

**Related Behaviors:**
- B-DISP-006: Real Name Visibility Default
- B-DISP-007: Real Name Visibility Opt-In

**Testing Priority:** 🟡 HIGH (invitation flow, privacy)

**History:**
- 2026-02-27: Created

---

## Summary

| ID | Behavior | Priority |
|----|----------|----------|
| B-DISP-001 | Nickname defaults to first name on signup | 🔴 CRITICAL |
| B-DISP-002 | Display preference toggle syncs personal group name | 🔴 CRITICAL |
| B-DISP-003 | Nickname edit syncs when preference = nickname | 🔴 CRITICAL |
| B-DISP-004 | Real name edit syncs when preference = real_name | 🟡 HIGH |
| B-DISP-005 | Nickname cannot be blank | 🔴 CRITICAL |
| B-DISP-006 | Real name visibility default is false | 🟡 HIGH |
| B-DISP-007 | Real name visibility opt-in | 🟡 HIGH |
| B-DISP-008 | Admin always sees real name | 🟡 HIGH |
| B-DISP-009 | Forum posts show display name | 🟢 MEDIUM |
| B-DISP-010 | Messages show display name | 🟡 HIGH |
| B-DISP-011 | Invitation search matches both names | 🟡 HIGH |

**Total: 11 behaviors (4 CRITICAL, 6 HIGH, 1 MEDIUM)**

---

## Notes

**Domain Code:** DISP (Display Name)

Add to the domain codes list in `_template.md`:
- DISP: Display Name / Nickname

**Key Design Principle:** The personal group `name` is the SINGLE SOURCE OF TRUTH for display identity. All social surfaces read from it. The `sync_personal_group_display_name()` trigger keeps it in sync with the user's preference. No surface should ever query `users.full_name` for display purposes (except admin panel and own-profile view).
