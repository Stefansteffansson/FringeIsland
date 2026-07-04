# Session bridge — Cycle G-B platform half built (FEAT-PC011), paused at the schema gate

**Date:** 2026-07-04
**Session type:** Build session (`feature-development`) — continues from bridge `2026-07-04_02` (G-B decomposed).
**Status:** FEAT-PC011 built, all gates green, **PR open, awaiting Stefan's schema-gate nod** (fuller-auto carve-out — no auto-merge). FEAT-H014 not started (builds after the nod + merge).
**Participants:** Claude (autonomous); Stefan reviews at the gate.

---

## What was built

**FEAT-PC011** (`5-in-cycle`; flips `6-done` with H014 after the gate) — migration `supabase/migrations/20260704090434_feat_pc011_role_permission_contracts.sql`, applied to dev + repaired:

- Six member-facing SECURITY DEFINER contracts over the existing PC-3 role substrate (**no new table, no policy changes**): `get_group_roles` (fabric + viewer capability flags + the 44-key catalog riding the payload), `create_group_role` (template path trigger-copied / custom path with definition-time anti-escalation), `update_group_role` (partial rename/describe), `set_group_role_permission` (single-grant flip, row-presence model), `delete_group_role` (custom + unheld only), `assign_member_role` / `remove_member_role` (through `can_assign_role()`; invariants surfaced verbatim).
- Internal `role_fabric_entry` payload helper (no client execute grants).
- `get_group_detail` members payload extended **additively** (`member_group_id`, `roles[]`); PC010's suite untouched and green.
- TRUNCATE revoked from `anon`/`authenticated` on all three role tables (was granted; verified absent post-apply via `information_schema`).

**Evidence:** `hub/tests/integration/groups/role-permission-contracts.test.ts` — 32 tests, **27 demonstrated red** (PGRST202 / missing keys) → green post-migration; STORY-5's two `get_user_permissions` asserts + STORY-6's five direct-path asserts labelled non-red-first by design (existing substrate, pinned/verified). Groups domain 55/55; **full integration 160/160** (27 suites); lint clean. Full details in the spec's Implementation notes.

## Decisions made / facts locked this session

1. **Open Q4 resolved (verified on dev):** `grp_insert` `with_check` = `manage_roles AND has_permission(actor, group, get_permission_name(permission_id))`. The contracts enforce the same predicate on both grant paths.
2. **Open Q2 / Q3 defaults carried and tested** (template-derived instances grant-editable; delete refused while held, P0001). Confirm at the gate.
3. **Build-discovered trapdoor:** `copy_template_permissions` auto-links a new role named `X` when `'X Role Template'` exists and copies its grants — a "custom" `Steward` role would defeat definition-time anti-escalation. Contract refuses colliding names (22023, tested).
4. **STORY-5 AC deviation (recorded):** "non-member result is empty" is unsatisfiable — the FringeIsland Members system-group baseline contributes globally by design. Realized as baseline-indistinguishability (foreign-private ≡ ghost context; no group-derived key leaks; tested both ways).
5. `test:integration:rbac` is a legacy script matching no v2 tests — v2 role coverage is the PC011 suite. (Candidate cleanup at cooldown.)

## Gate items for Stefan (the direct-caller question, GP3)

- **Auto-link residue (item 3 above, direct path):** RLS `group_roles_insert` checks only `manage_roles`, so a `manage_roles` holder can still *mint* an over-granted role by direct INSERT under a template-colliding name. `can_assign_role()` remains the wall that stops such a role being *bound*. Left un-narrowed per the spec's no-policy-changes posture — confirm or route a follow-up.
- **`remove_roles` vs `assign_roles`:** the contract gates removal on `remove_roles`; the existing `ugr_delete` RLS gates on `assign_roles`. A member with `assign_roles` but not `remove_roles` can unbind via the direct path what the contract refuses. Same posture — flagged, not narrowed.
- Open Q2/Q3 defaults, Q4 predicate record, and the STORY-5 deviation (items 1/2/4 above).
- **Substrate observation (H014-relevant):** the G-A bootstrap names role instances verbatim after templates (`'Steward Role Template'`) — the fabric read returns those names; rename via `update_group_role` is the remedy. H014's roles panel copy should expect them.

## Next steps

1. **Stefan:** review PR (migration + gate items) → nod → merge.
2. **Then H014** (`feature-development`): TASK files, red-first route-units → roles panel / member-list chips / "what I can do here" + honest act-as shell units → E2E (Steward shapes a role, assigns it, assignee's view changes; escalation refusal; last-Steward refusal) → `next build` gate → 6-done paperwork for both features + §L4 syncs + CHANGELOG cycle entry + dashboard refresh.
3. Standing (unchanged from bridge `2026-07-04_02`): G-36/IDN-10 parked specs by next cooldown; org-spec §5 seeding-sites doc-health finding queued; IDN-12 + perf T2 parked; P3b/P4/P1-residual parked.
