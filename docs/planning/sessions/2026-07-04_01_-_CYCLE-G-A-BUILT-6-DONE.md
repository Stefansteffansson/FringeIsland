# Session bridge — Cycle G-A built: FEAT-PC010 + FEAT-H013 6-done (group creation & stewardship; first PC-3 feature; P3a shipped)

**Date:** 2026-07-04
**Session type:** Cycle G-A build (`feature-development`; decomposition was `2026-07-03_07`).
**Status:** **Built and verified; PR open at the schema gate** (new SECURITY DEFINER functions + the `groups` direct-write narrowing + seeds + the P3a hardening migration — the fuller-auto carve-out pauses for Stefan's merge nod).
**Participants:** Stefan + Claude

---

## What was built

**FEAT-PC010 — group creation & settings contracts (PC-3's first feature).**
Migration `20260704075547` (applied to dev + repaired; **no new table**):
- `create_engagement_group()` — atomic bootstrap (group + role instances from `group_template_roles`, the union across templates when none chosen; the existing `copy_template_permissions` trigger materialises grants; creator active membership + **permission-derived Steward binding** — the instance whose template grants `assign_roles`, no role-name strings). FIM-only + active-account-only (suspended refused — the decision-default, now gate-facing).
- `get_group_detail()` — member-or-(public+active) visibility; **P0002 no-leak**; viewer block with `can_manage_settings`; member list per `view_member_list` OR public+toggle (**Q3 refined** — permission-faithful; deviation recorded); display-identity names.
- `update_group_settings()` — partial update; per-field catalog keys (**Q2**: `edit_group_settings` / `set_group_visibility` / `control_member_list_visibility`); no path to `status`/`group_type`.
- **ADR-U038 narrowing (Q4)**: INSERT/TRUNCATE revoked from client roles (verified hole: the legacy `with_check` let a Mist create an un-bootstrapped row by naming its own proto personal group); UPDATE column-scoped. RLS kept as defense-in-depth; DELETE untouched (GRP-9, G-E).
- **Seeding repair**: idempotent `FringeIsland Members`/`DeusEx` (C3-1). Finding: `seeds/04_system_groups.sql` already carries all four system groups (Mist rename done) — **the org-spec §5 "archive-only" claim is stale → doc-health finding**, not edited mid-build.

**FEAT-H013 — the Hub surfaces (no migration).**
`POST /api/groups` + `GET`/`PATCH /api/groups/[id]` (Edge+`dub1`; ADR-U037 read identity; SQLSTATE→HTTP; id-only telemetry) · `CreateGroupPanel` (two independent visibility toggles with governing copy) · `/groups/[id]` (journal-pattern gate; 404 = house not-found, no-leak-consistent) · `GroupDetailPanel` + dirty-diff `GroupSettingsForm` (only changed fields sent; vocabulary-tolerant status badge; honest "member list hidden" copy) · list page wired (create affordance + row→detail links).

**P3a (boundary NFR bet, D1)** — migration `20260704075549`: the advisor-verified 14 FK covering indexes + the 2 remaining `auth_rls_initplan` wraps. Backlog updated to "executed".

## Verification

- **Red-first honored:** PC010 19 integration tests — 16 demonstrated RED (PGRST202 + the direct-INSERT *succeeding*) → GREEN post-migration; **labelled exceptions:** the settable-column regression-guard + the seeding presence assert (dev carried state). H013: 13 route-unit + 16 component/page unit red-first; 3 E2E.
- **Full pyramid green:** unit **249/249** · integration **128/128** (`--runInBand`) · **E2E 38/38** · `next build` clean · lint 0 errors (one pre-existing warning).
- **API-boundary DoD:** adversarial direct-caller integration coverage (FIM + Mist INSERT, Steward column-flip UPDATE, cross-user/ghost P0002, Mist 42501 on all three contracts).

## Found / learned this build

1. **The Mist-shaped hole was real and specific:** the naive direct INSERT (no `created_by`) was already refused; the with_check-satisfying shape (own proto personal group) succeeded — the adversarial test had to aim at the *permitted* shape. Re-aimed mid-red.
2. **`copy_template_permissions` trigger** auto-copies template grants on `group_roles` INSERT — contract code must not double-copy (`ON CONFLICT` would mask it).
3. **Creator binding fires `notify_role_assigned`** (a durable "Role Assigned" notification to the creator) — legacy substrate behaviour, accepted; A-NTF owns its future.
4. **`admin.createUser` is consent-gated** (ADR-U038 S3): the E2E outsider FIM was refused ("Database error creating new user") until `consent_accepted` metadata was supplied — global-setup's shape; the gate demonstrably works on every creation path.
5. The perf backlog's initplan "sweep across all RLS" was already clean except 2 policies — advisor-verify before sizing NFR work.

## Process notes

- Tasks: TASK-PC010-01/02 + TASK-PERF-P3A-01 at **review** (schema gate); TASK-H013-01/02/03 done. Task files are back per D6. Tasks stay until the cycle retrospective.
- Both specs `6-done` with Implementation notes; §L4 rows (organisation-specification — its first feature rows — + hub SPECIFICATION), both feature indexes, root + Hub CHANGELOGs, Groups plan G-A row, perf backlog carried in this batch.

## State / next

- **PR open, waiting for the schema-gate merge nod** (SECURITY DEFINER functions over PC-3 tables + the `groups` privilege narrowing + seeds + P3a indexes/policy wraps). Gate questions pre-answered in the migration comments; the direct-caller matrix is tested, not asserted.
- After merge: next is the **Cycle G-B decompose session** (roles & permissions — GRP-6/7/8) per the Groups plan; the exit-checklist hooks (IDN-10 cascade line, MEM-9 seam) remain planted.
- Standing: G-36/IDN-10 parked specs by next cooldown; doc-health finding queued (org-spec §5 seeding-sites staleness); IDN-12 + perf T2 parked.
