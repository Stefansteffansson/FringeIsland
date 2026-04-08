# Session: Display Name / Nickname System

**Date:** 2026-02-27
**Version:** 0.2.30
**Focus:** Full TDD sprint — Display Name / Nickname System

---

## Summary

Implemented the Display Name / Nickname System in a complete 7-phase TDD sprint. Users can now set a nickname, toggle between displaying their real name or nickname platform-wide, and control whether other users can see their real name. The personal group `name` field is the single source of truth for display identity across all social surfaces.

---

## Completed

- [x] Phase 1: Behavior specs (11 behaviors, B-DISP-001 through B-DISP-011)
- [x] Phase 2: Failing tests (28 tests across 2 suites)
- [x] Phase 3: Confirmed RED (25 failing, 3 expected false-positives)
- [x] Phase 4: Architect review (schema, trigger, signup, backfill confirmed)
- [x] Phase 5a: Database migration (3 columns, sync trigger, handle_new_user() update)
- [x] Phase 5b: UI changes (profile edit form with nickname, display preference, visibility)
- [x] Phase 5c: Integration wiring (AuthContext, Navigation, Messages, InviteMemberModal)
- [x] Phase 6: QA/Review (466/466 tests, security review)
- [x] Phase 7: Documentation (feature doc, CHANGELOG, PROJECT_STATUS, ROADMAP)

---

## Technical Changes

### Database Migration
- `supabase/migrations/20260227095615_add_display_name_system.sql`
  - 3 new columns on `users`: `nickname`, `display_preference`, `show_real_name`
  - Backfill nickname from `split_part(full_name, ' ', 1)`
  - `nickname_not_empty` CHECK constraint
  - `sync_personal_group_display_name()` AFTER UPDATE trigger (SECURITY DEFINER)
  - Updated `handle_new_user()` to set nickname and use it for personal group name

### Files Created
- `docs/features/implemented/display-name-system.md` (moved from planned/)
- `docs/specs/behaviors/display-name.md` (11 behavior specs)
- `tests/integration/users/display-name.test.ts` (16 tests)
- `tests/integration/users/display-name-rls.test.ts` (12 tests)
- `docs/old_products/ferd/sessions/2026-02-27-display-name-system.md` (this file)

### Files Modified
- `lib/auth/AuthContext.tsx` — UserProfile expanded with nickname, display_preference, show_real_name, display_name; queries JOIN personal group name
- `components/Navigation.tsx` — 4 references switched from full_name to display_name
- `app/messages/page.tsx` — ConversationItem uses display_name; fetches via personal group JOIN
- `app/messages/[conversationId]/page.tsx` — OtherUser uses display_name; same JOIN pattern
- `components/groups/InviteMemberModal.tsx` — Search includes nickname; display_name as primary; full_name gated by show_real_name
- `components/profile/ProfileEditForm.tsx` — New fields: nickname input, display preference radio, show_real_name toggle
- `app/profile/edit/page.tsx` — Expanded interface and fetch for new columns
- `app/profile/page.tsx` — Shows display name, nickname, full name with visibility indicators
- `tests/integration/rbac/personal-groups.test.ts` — Updated expectation for new nickname-based personal group name

---

## Decisions Made

1. **Personal group `name` as single source of truth** — All social surfaces resolve display names from the personal group, not from `users.full_name`
2. **AFTER UPDATE trigger (not BEFORE)** — Avoids interference with 3 existing BEFORE UPDATE triggers on `users`
3. **Application-layer `show_real_name` enforcement** — RLS is row-level only; column visibility is enforced at query layer
4. **Default: nickname = first name, preference = nickname, show_real_name = false** — Privacy-first default
5. **Trigger sync eliminates manual personal group name updates** — Removed from ProfileEditForm; trigger handles it

---

## Security Review Findings

- **High (design):** `show_real_name` is app-layer only — any authenticated user can SELECT full_name from users table. Known limitation of RLS (row-level, not column-level). Documented in feature spec.
- **Medium (pre-existing):** PostgREST filter injection in InviteMemberModal `.or()` string interpolation. Not a regression.
- **Low:** No max length constraint on nickname in DB (ProfileEditForm enforces maxLength=50 client-side).

---

## Test Results

- **Tests:** 466 total (466 passing, 0 failing)
- **New tests:** 28 added (16 + 12)
- **Behaviors documented:** 11 (B-DISP-001 through B-DISP-011)

---

## Next Steps

- [ ] Orphan Group Stewardship Transfer (priority — admin can't delete users who are last Steward)
- [ ] Mobile responsiveness audit
- [ ] User onboarding flow
