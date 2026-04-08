# Session: RLS Bootstrap Fixes + Group Deletion + Auth Hardening

**Date:** 2026-02-11
**Duration:** ~3 hours
**Version:** 0.2.12
**Focus:** Fix cascading RLS gaps that broke group creation, role assignment, and group deletion

---

## 📝 Summary

This session was primarily focused on debugging and fixing a series of cascading RLS policy gaps that had been present since early development but only surfaced during testing/usage. The root cause pattern in all cases: RLS was enabled on tables but policies were either missing, overly restrictive, or incorrectly structured.

We also completed two outstanding feature items: B-GRP-005 (Group Deletion with Danger Zone UI) and B-AUTH-002 (blocking inactive users on sign-in).

---

## ✅ Completed

- [x] **B-GRP-005: Group Deletion** — Danger Zone UI, DELETE RLS policy, cascade trigger fix
- [x] **B-AUTH-002: Inactive User Blocking** — signIn() now checks is_active and auto-signs out
- [x] **user_group_roles RLS** — replaced placeholder INSERT policy; added missing DELETE policy
- [x] **group_memberships bootstrap** — added creator self-join policy (broken since Feb 11 cleanup)
- [x] **catalog table RLS** — group_templates/role_templates were silently blocking all reads
- [x] **Migration tooling** — `scripts/apply-migration-temp.js` established as reliable workflow
- [x] **Behavior spec audit** — auth.md and journeys.md updated to reflect actual test coverage

---

## 🔧 Technical Changes

### Files Created
- `supabase/migrations/20260211181225_add_group_delete_policy.sql`
- `supabase/migrations/20260211182333_fix_user_group_roles_insert_policy.sql`
- `supabase/migrations/20260211183334_fix_group_memberships_bootstrap_insert.sql`
- `supabase/migrations/20260211183842_add_select_policies_for_catalog_tables.sql`
- `scripts/apply-migration-temp.js`

### Files Modified
- `app/groups/[id]/edit/page.tsx` — Added Danger Zone, handleDelete(), confirmation modal
- `tests/integration/groups/deletion.test.ts` — Last test now expects success (Group Leaders can delete)
- `lib/auth/AuthContext.tsx` — signIn() queries is_active, auto signs out inactive users
- `tests/integration/auth/signin.test.ts` — Updated B-AUTH-002 test
- `docs/specs/behaviors/groups.md` — B-GRP-005 marked ✅ IMPLEMENTED
- `docs/specs/behaviors/authentication.md` — B-AUTH-002 marked ✅

### Database Changes (4 migrations)
1. **20260211181225** — `prevent_last_leader_removal` trigger fix (allow cascade when group deleted); DELETE policy on `groups` for Group Leaders
2. **20260211182333** — `group_has_leader()` SECURITY DEFINER helper; replaced `user_group_roles` INSERT policy; added `user_group_roles` DELETE policy
3. **20260211183334** — `group_memberships` "Group creator can join their own group" bootstrap INSERT policy
4. **20260211183842** — SELECT `USING(true)` policies for `group_templates`, `role_templates`, `role_template_permissions`, `group_template_roles`

---

## 💡 Decisions Made

1. **Bootstrap pattern for group creation**: Rather than making group creation atomic (server-side function), we use per-step RLS bootstrap clauses. Each step (membership, role assignment) has a special "no leader yet + creator = self" condition. Keeps all logic in RLS, no additional API surface.

2. **Catalog tables as open-read**: `group_templates` and `role_templates` are shared reference data with no private content. `USING(true)` SELECT policy is appropriate — analogous to a public enum table.

3. **Group deletion without warning on active journeys**: For MVP, cascade deletes enrollments without blocking. May add a confirmation warning in a future version.

---

## ⚠️ Issues Discovered

- **Migration tracking with date-only prefixes is permanently broken**: Files like `20260125_1_xxx.sql` all collapse to version `20260125`. Only one file per version string can be tracked. The `supabase db push` command will always complain about untracked local files with these names. **Mitigation**: Use `apply-migration-temp.js` + `migration repair` for all future migrations.

- **RLS audit needed**: The catalog table discovery (role_templates etc. with no SELECT policy) suggests other tables may have similar gaps. Consider a full audit of all 13 tables' policies against their actual usage.

---

## 🎯 Next Steps

- [ ] Verify group creation flow end-to-end in browser (full cycle test)
- [ ] Add B-ROL-001 behavior spec (Role Assignment Permissions) — fully implemented but undocumented
- [ ] Start Phase 1.5: Communication System (forums, messaging, notifications)
- [ ] Consider RLS policy audit across all 13 tables

---

## 📚 Context for Next Session

**Key RLS patterns established this session:**
- Bootstrap INSERT: `NOT group_has_leader(group_id)` for first-time self-assignment
- Creator self-join: `(SELECT created_by_user_id FROM groups WHERE id = group_id) = get_current_user_profile_id()`
- Cascade-safe trigger: `IF NOT EXISTS (SELECT 1 FROM groups WHERE id = OLD.group_id) THEN RETURN OLD; END IF;`

**Migration workflow (canonical):**
```bash
bash supabase-cli.sh migration new <name>          # create timestamped file
# edit the .sql file
node scripts/apply-migration-temp.js <file.sql>    # apply via management API
bash supabase-cli.sh migration repair --status applied <timestamp>
bash supabase-cli.sh migration list               # verify
```

**Group creation flow (GroupCreateForm.tsx):**
1. INSERT groups → INSERT policy: authenticated users can create
2. INSERT group_memberships (status='active') → "Group creator can join their own group"
3. SELECT role_templates → "Authenticated users can read role templates"
4. INSERT group_roles → authenticated users can create (in their groups)
5. INSERT user_group_roles → bootstrap clause (NOT group_has_leader)

**Related:**
- Previous session: `docs/planning/sessions/2026-02-10-journey-player-and-test-stability.md`
