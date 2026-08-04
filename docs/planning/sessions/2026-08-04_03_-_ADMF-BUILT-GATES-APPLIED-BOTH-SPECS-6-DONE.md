# Session bridge — ADM-F built and closed: both gates named-approved and applied, the gate caught two real defects, both specs 6-done

**Date:** 2026-08-04 (session 7) · **Wave:** Ferd · **Cycle:** ADM-F (CLOSED)
**Follows:** [`2026-08-04_02_-_ADMF-DECOMPOSED-BOTH-SPECS-4-READY.md`](./2026-08-04_02_-_ADMF-DECOMPOSED-BOTH-SPECS-4-READY.md)

---

## READ THIS FIRST — ADM-F is fully closed; the sequence continues at ADM-G

1. **Both specs are `6-done`** — [FEAT-PC025](../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md) (contracts, two applied migrations) and [FEAT-H040](../../products/hub/features/FEAT-H040-role-template-editor-and-audit-target-honesty.md) (`/admin/roles` + the fifth card + the three walk-rider closures). Implementation notes in both carry the full evidence chain; all three changelogs written.
2. **The next moves (unchanged):** ADM-G (WF-2, suspended-groups-only admin access) → N-E (WF-1 bell-answerable invitations + polish rider) → AB-6 (the FULL audit, Phase-4 cutover's entry condition).
3. **One named deferral:** no deep-cold spot measurement of `/admin/roles` this cycle — the admin plane's cold class was measured at the A-ADM area gate (provisioning-dominated, standing pre-launch exception) and these pages ride the same physics; the next full ADR-U043 pass lands at AB-6. Recorded in FEAT-H040's Implementation notes.

## What happened (gate-to-gate in one arc)

- **#408 merged on Stefan's named approval → `20260804190000` applied.** Post-apply the gate suite ran **3 red / 14 green — the reds were real**, deterministic across two runs, and both defects were contract-body, not test: (1) **the clone didn't ride template-less instantiation** — `create_engagement_group`'s "every role template" path actually read through `group_template_roles`, a junction clones never join; the decomposition-time derivation "zero changes to instantiation physics" was wrong on exactly this point, and the STORY-2 gate cell caught it. (2) **WA-2 resolved targets to the nickname** — the personal-group name is `split_part(full_name, ' ', 1)`; the full display name lives in `users.full_name`.
- **#410 (the gate-fix migration `20260804210000`) built, held, named-approved, applied** — template-less instantiation reads `role_templates` directly (behavior-identical whenever no clones exist); the audit resolver reads `full_name` through both the user-id and personal-group-id doors; actor resolution untouched (PC022 law). **Gate 17/17.**
- **Full integration 1007/1008 → the 1 red was the WA-3 supersession at a site the #408 sibling sweep wrongly LEFT**: the erasure suite's characterization pinned the pre-WA-3 law (23503 refusal on a consented FIM) — exactly the walk defect WA-3 fixed. Adapted (labelled) to pin anonymise-then-delete; merged as #411; suite 5/5, integration effectively 1008/1008.
- **Affected E2E 10/10** (admin audit browser + members bulk) post-apply.
- **TASK-ADMF-02 tranche 2 built red-first**: `admin-roles-view` + `admin-role-template-detail` suites demonstrated red at import (+ the dashboard's Roles-card cell red), then 37 green; route-policy + outer-ring zero exceptions; the 11-cell E2E journey green (leak 0→0); `next build` green; unit sweep **1256/1256**; lint 0 errors (3 pre-existing warnings elsewhere).
- **Walk riders closed proven-first:** WA-4's E2E cell put a live second-context browser on `/login` within seconds of admin force sign-out **before** the ceremony copy was softened (red-first at unit tier: the H036 hedge pin adapted; the bulk ceremony gained the instant line). WA-3's cell hard-deleted a genuinely consented fixture through the console — consent record surviving subject-anonymised. STORY-4's route pin asserts the seed-immutability refusal verbatim at the BFF door.

## Plain-English walkthrough (the J-B narrative, walked against shipped behaviour)

An administrator opens the admin dashboard and finds a fifth card: **Role templates**. Opening it, they see the four seeded templates — badged as seeded — each with its default version, how many versions exist, which group templates carry it, and how many live group roles came from it; beside them, the whole permission catalogue, grouped by category, protected permissions marked, nothing editable. They open Steward Role Template: its history shows version 1, and the only action is **Clone**. The confirmation tells them out loud what cloning does — the clone will appear in every member's group-creation options and ride every group created without a chosen template. They name it, clone it, and it's in the list, unbadged. On the clone's page they uncheck a permission and save — a **draft**: version 2 appears in the history, but the default marker stays on version 1 and nothing anywhere has changed. **Apply** shows them precisely what applying means — which permissions are added, which removed, any rename, and the sentence that matters: existing group roles keep their snapshot; future groups instantiate the new set. They confirm; the pointer moves. A member creating a group without choosing a template now finds the clone's role in it. The administrator applies version 1 again — same ceremony, diff reversed — and the world rolls back. Every one of those moments is an audit row carrying the old-set → new-set diff, and the audit log itself now names its targets: members as name + email, groups by name, the raw id one click away in the detail. When they force-sign-out a member, that member's open tab lands on the sign-in page within seconds — and the ceremony now says so plainly. And when they must hard-delete a member who once gave consent, the console completes it: the person is gone, the consent record survives with the personal link blanked — proof retained.

## Standing items

TASK-E2E-02 (consented-fixture leak; purge decision Stefan's) · TASK-E2E-01 (profile.spec flake, due at a boundary) · the deferred Eid piles · the `/admin/roles` deep-cold deferral above (AB-6).

## Close ritual (this session)

- [x] Both migrations applied on named approvals (#408, #410); ledger repaired both
- [x] Post-apply verification set green (gate 17/17 · integration 1008/1008 · E2E 10/10 + the new 11/11 journey · unit 1256/1256 · `next build`)
- [x] Both specs `6-done` + L4 rows + README rows + all three changelogs + both task files, same batch
- [x] Session bridge (this file) with the J-B walkthrough
- [ ] Dashboard refresh + discovery sweep at commit time
- [ ] No doc-health run owed (no cross-cutting change; cycle boundary ritual is the ADM-area retro cadence — ADM-F was a rider cycle)
