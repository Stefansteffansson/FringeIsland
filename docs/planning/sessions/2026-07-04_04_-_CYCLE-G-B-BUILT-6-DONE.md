# Session bridge — Cycle G-B built and closed (FEAT-PC011 + FEAT-H014 `6-done`)

**Date:** 2026-07-04
**Session type:** Build session (`feature-development`) — same session as bridge `2026-07-04_03` (PC011 built, gate pause). Stefan reviewed PR #65, agreed to all five gate items (incl. the STORY-5 AC amendment, option 1), and gave the nod; PC011 merged, then FEAT-H014 built to `6-done`.
**Status:** **Cycle G-B complete.** GRP-6/7/8 live end-to-end.
**Participants:** Stefan (gate review + nod) + Claude

---

## Gate resolution (Stefan, this session)

All five items from bridge `2026-07-04_03` accepted: Open Q2/Q3 defaults confirmed; Open Q4's predicate recorded; the `copy_template_permissions` auto-link trapdoor stays closed contract-side with the direct-path residue accepted (`can_assign_role()` is the binding wall); the `remove_roles`-vs-`assign_roles` direct-path divergence accepted as defense-in-depth posture; **STORY-5's AC-3 amended in place** (baseline-indistinguishability, not literal empty — the system-group global rule makes "empty" unsatisfiable and the AC contradicted its own story's AC-1). Amendment rode PR #65 before merge (commit `22c80d0`).

## What was built after the merge (FEAT-H014, no migration)

- **BFF:** `GET/POST /api/groups/[id]/roles` (GET Edge+`dub1`; **composes `{ fabric, templates }`** — build-resolved gap: the fabric payload carries the catalog but not the template vocabulary; `role_templates` is RLS-readable by any authenticated client, so the BFF composes it, no new contract), `PATCH/DELETE .../roles/[roleId]` (PATCH one-operation-per-call: rename or one `set_permission` flip), `POST/DELETE .../members/[memberGroupId]/roles/[roleId]`, `GET .../my-permissions` (Edge+`dub1`). SQLSTATE map extended: **23505/P0001 → 409**, invariant messages passed through. Id-only telemetry on every success/refusal.
- **Surface:** `RolesPanel` (cards + badges + holder counts + grant chips; add-from-template with prefilled short name / custom with a category-grouped checklist; per-role grant editor; ConfirmModal delete — hidden for template-derived, payload-categorical), member-list **role chips + assign picker + chip-remove** on `GroupDetailPanel` (fabric-flag-gated), `MyPermissionsPanel` with the **honest v1 act-as shell**. The page composes three reads with **one refresh path**; fabric/permissions failures stay panel-local.
- **First cuts taken (per Appetite):** rename/describe UI (PATCH path exists + route-unit-covered) and chip category-grouping on cards.

## Evidence & gates

40 new unit tests demonstrated red → green (20 route-units; 9 RolesPanel + 4 MyPermissionsPanel + 6 member-chips + 1 one-refresh-path page test); 2 new E2E journeys (delegation arc incl. the assignee's live escalation refusal; last-Steward refusal, chip stays). **Full unit 289/289 · integration 160/160 · E2E 40/40 · `next build` clean · lint 0 errors** (one pre-existing warning).

## Findings worth carrying

1. **E2E suite isolation:** a new spec riding the shared storageState session is exposed to (a) profile.spec's sign-out journey revoking the shared token globally and (b) parallel-worker refresh-token rotation races. Broke the full run both directions; fixed by the **dedicated spec-created FIM + own context** pattern (H013's second-FIM precedent, extended). Recommend future E2E specs with long journeys or session-sensitive flows use their own user by default.
2. **Contract honesty met the UI in the E2E:** a viewer without `view_member_list` on a private group gets no member list from `get_group_detail` — hence no assignment surface. Surfaced by the first red E2E run; the fixture role now grants it. Not a bug — the system being honest.
3. **Instance naming:** G-A-bootstrapped roles are named verbatim after templates (`'Steward Role Template'`). Rendered as-is; `update_group_role` rename is the per-group remedy. A copy/UX question for a later pass if Stefan wants prettier defaults (would be a PC010 bootstrap change, not a Surface hack).
4. `test:integration:rbac` is a legacy npm script matching no v2 tests — cleanup candidate at cooldown.

## Next steps

1. **Cycle G-C (invitations & joining, MEM-1/2/3)** — decompose session next, per the Groups plan (D3 member-search seam, D4 outbound-email seam are the scope gates).
2. Standing: G-36/IDN-10 parked specs by next cooldown; org-spec §5 seeding-sites doc-health finding queued; IDN-12 + perf T2 parked; P3b/P4/P1-residual parked; group-as-actor design session at the G-E → G-F boundary.
