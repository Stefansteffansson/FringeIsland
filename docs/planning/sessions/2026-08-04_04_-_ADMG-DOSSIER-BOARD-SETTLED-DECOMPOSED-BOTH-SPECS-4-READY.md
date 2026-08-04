# Session bridge — ADM-G kickoff complete: substrate dossier committed, the G-board settled, both specs decomposed to 4-ready

**Date:** 2026-08-04 (session 8) · **Wave:** Ferd · **Cycle:** ADM-G (decomposed; build next)
**Follows:** [`2026-08-04_03_-_ADMF-BUILT-GATES-APPLIED-BOTH-SPECS-6-DONE.md`](./2026-08-04_03_-_ADMF-BUILT-GATES-APPLIED-BOTH-SPECS-6-DONE.md)

---

## READ THIS FIRST — the fresh session starts at the ADM-G build

1. **Both specs are `4-ready`** — [FEAT-PC026](../../platform/core/features/FEAT-PC026-suspended-group-admin-access-contracts.md) (the suspended-group admin access contracts) ↔ [FEAT-H041](../../products/hub/features/FEAT-H041-suspended-group-admin-content-view.md) (the admin content wing). L4 rows + README rows landed in the same commit (#415). Load the `feature-development` skill; cycle tasks TASK-ADMG-01/02 by the house default. **The platform half is one schema-gate migration** — held with red evidence + apply commands for NAMED approval, the standing rule.
2. **The G-board is settled** (recorded in the [dossier](../hub-v2/2026-08-04-admg-substrate-dossier.md), #414 — Stefan: all four rows as recommended): **G-1** = dedicated admin content view on `/admin/groups/[id]` (member-plane visibility law untouched) · **G-2** = new pair PC026 ↔ H041 · **G-3** = journey progress OUT (dated deferral 2026-08-04) · **G-4** = message bodies IN, group-kind conversations only. The riding defaults stand unobjected (member-plane 404 stays; durable read telemetry; no realtime on the admin wing; RLS arms land with contract arms; members from the shipped `members[]`).
3. **The dossier's reframe is load-bearing for the build:** all twelve of PC023's read-door suspension arms exist — **ten are unreachable** behind membership gates with no admin arm. The migration edits the *preceding gates* (three doors + the `is_conversation_participant` chokepoint), never the quarantine arms. The conjunct trap is written into the spec: the helper's admin arm must be a suspended-scoped, group-kind-scoped disjunct of the participation conjunct, or admins gain sight of ALL conversations.
4. **One walk claim was refuted in verification and is marked in the dossier:** `get_user_permissions` returns platform admins the **full permission catalogue for any context group** (system tier context-free, `20260222000000:502`; DeusEx auto-grant) — not the empty array the Hub walk asserted. Corollary pinned as PC026 STORY-3 + AB-6 material: **any door gated purely by `has_permission` silently passes platform admins today** (why `get_group_forum` already works).
5. **Build-time verifications the specs name:** the `admin_remove_member_from_group` signature (PC021 — cumulative-forward read, don't assume); the exact DS-5 sealed primitive the moderate wrapper composes (ADR-U047 rule 3 — never a second table-touching body); the sibling-assertion sweep enumerated in the migration header (PC023 gate cells, C-series communication suites, the ADM-B `admin_get_group_detail` cells + the Hub `AdminGroupMember` type).
6. **The sequence after ADM-G (unchanged):** N-E (WF-1 bell-answerable invitations + the polish rider) → AB-6 (the FULL audit — its docket now carries the Tier-1 finding and the `/admin/roles` + admin-plane deep-cold ADR-U043 pass).

## What this session did (gate-to-gate)

- Discovery sweep: no-op (worktree clean, synced). ADM-F's carried dashboard refresh run.
- **Two delegated substrate walks** (platform door-by-door read-quarantine audit vs applied migrations, latest-definition-wins; Hub surface anatomy) — both landed whole, lead-session spot-verified four load-bearing citations against canonical, **refuted one** (bridge point 4). Dossier committed (#413), ADM-F shape (synthesis → board → both fact sheets verbatim, correction marked).
- **The G-board presented whole and settled** — all four rows on the recommendations; settlement recorded in the dossier (#414).
- **Decomposed both specs to 4-ready** under the `ecosystem-decomposition` skill (#415): payload walk embedded in H041 (every rendered field to a named key; the one cross-feature payload is `admin_get_group_detail`, whose members rows gain `email` for the W-4 echo — a payload-walk catch); the reactivation-race AC topology-checked (real race: wing open, group reactivated elsewhere → next read refuses, wing collapses); Vertical Impact complete in both (Privacy is the load-bearing one: purpose-bound suspended-only sight, audited, content-free telemetry, no new storage).

## Standing items

TASK-E2E-02 (consented-fixture leak; purge decision Stefan's) · TASK-E2E-01 (profile.spec flake, due at a boundary) · the deferred Eid piles · the `/admin/roles` + admin-plane deep-cold ADR-U043 pass at AB-6 · **new:** the G-3 journeys deferral (dated 2026-08-04, revisit on walk demand) and the Tier-1 `has_permission` finding on AB-6's docket.

## Close ritual (this session)

- [x] Dossier + board settlement + decomposition merged (#413, #414, #415); discovery synced after each merge
- [x] Both specs 4-ready + L4 rows + README rows, same batch (#415)
- [x] Session bridge (this file)
- [x] Dashboard refreshed at commit time
- [ ] No doc-health run owed (no cross-cutting change; specs are additive)
- [x] Checkout left on main, clean
