# Session bridge — Cycle G-B decomposed (FEAT-PC011 ↔ FEAT-H014: roles & permissions, GRP-6/7/8)

**Date:** 2026-07-04
**Session type:** Decompose session (`ecosystem-decomposition`, L4) — same session as the G-A build + merge (bridge `2026-07-04_01`; PR #62 merged after Stefan's plain-words review + nod).
**Status:** Specs `4-ready`, ready for the G-B build session.
**Participants:** Stefan + Claude

---

## Substrate audit at decomposition (dev DB, 2026-07-04)

Unlike `groups` (whose INSERT hole G-A closed), the three role tables carry a **substantively correct RLS surface already**: definition `manage_roles`-gated; assignment through the existing **`can_assign_role()` anti-escalation primitive** (you may only assign a role granting nothing you yourself lack); a **definition-time check** on grant inserts (the `grp_insert` policy — exact predicate truncated in the audit read, **verify at the gate**, PC011 Open Q4); template-derived instances deletion-protected (`created_from_role_template_id IS NULL` rule); `prevent_last_leader_removal` / `prevent_last_deusex_role_removal` guarding bindings. **`get_user_permissions(acting, context)`** already computes effective permissions (system-group memberships contribute globally — the DeusEx path) and is the published RPC PC-3 §3 cites. Steward template holds all five management keys (`manage_roles`, `assign_roles`, `remove_roles`, `pause_members`, `activate_members` — the latter two are G-D's).

**Consequence:** the G-B platform half is **contracts-over-proven-rules** — no new table, no policy changes, no hole-closing; RLS stays as defense-in-depth beneath six new SECURITY DEFINER contracts (+ TRUNCATE hygiene).

## What was decomposed

- **[FEAT-PC011](../../platform/core/features/FEAT-PC011-group-role-and-permission-contracts.md)** (`4-ready`) — `get_group_roles()` (fabric + capability flags `can_manage_roles`/`can_assign_roles`/`can_remove_roles` + the permission catalog riding the payload); `create_group_role()` (template instantiation via the `copy_template_permissions` trigger, or custom with explicit grants + **definition-time anti-escalation**); `update_group_role()` + `set_group_role_permission()` (per-group customisation incl. template-derived instances — Open Q2 default yes); `delete_group_role()` (custom + unheld only — Open Q3 default refuse-while-held); `assign_member_role()`/`remove_member_role()` (through `can_assign_role()`; invariants surfaced, never pre-checked-and-hidden). **GRP-8 needs no new function** — `get_user_permissions()` is the read. `get_group_detail` members payload extends **additively** (`member_group_id`, `roles[]`). **Open Q1 (load-bearing):** group-as-actor wielding (who acts *as* engagement group A inside group B) is unresolved governance — routed to **G-F/G-29**; v1 renders the personal-group context only.
- **[FEAT-H014](../../products/hub/features/FEAT-H014-group-roles-and-permissions.md)** (`4-ready`) — the roles panel on `/groups/[id]` (fabric read, add-from-template / custom-with-checklist, grant toggles, capability-flag-gated; escalation refusals surfaced verbatim); role chips + assign/remove on the member list (ConfirmModal on removal; the last-Steward refusal shown in place, never pre-empted); the "what I can do here" effective-permissions view + the **honest v1 act-as shell** (a real control with exactly one context, "Myself" — no mocked dropdown). Six BFF handlers (fabric read Edge+`dub1`); id-only telemetry (role names are member content).
- **§L4 reconciliation in the same batch:** organisation-specification (Group Role lifecycle + Permission resolution rows extended; Role Template management + Permission registry rows added — 6 of 11 PC-3 capabilities now carry specs), hub SPECIFICATION (H014 row + coverage note), both feature indexes, Groups plan G-B row.

## Next session (build, `feature-development`)

1. TASK files for PC011 (contracts + tests; adversarial direct-path verification incl. Open Q4's predicate) → red-first integration → one migration (six functions + additive payload extension + TRUNCATE revokes + grants) → **schema gate: `review`, pause for Stefan's nod**.
2. Then H014: TASK files, red-first route-unit → panel/list/permissions-view units → E2E (Steward shapes a role, assigns it, the assignee's "what I can do here" changes; escalation refusal; last-Steward refusal) → `next build` gate → 6-done paperwork.
3. Standing: G-36/IDN-10 parked specs by next cooldown; doc-health finding queued (org-spec §5 seeding-sites staleness); IDN-12 + perf T2 parked; P3b/P4/P1-residual parked.
